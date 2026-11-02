import { Loan } from "./types";
import { buildSchedule, calcStats, rateAt, remainingGraceMonths } from "./calc";

// 複数の借入の「どれから返すか」を比べるための試算。
// 毎月の追加返済額(extraMonthly)と、完済した借入の返済額(次の月から)を、優先順位の高い借入に回していく。
export type StrategyKey = "baseline" | "avalanche" | "snowball";

export const STRATEGY_LABEL: Record<StrategyKey, string> = {
  baseline: "今のまま（追加なし）",
  avalanche: "金利の高い順に返す",
  snowball: "残高の少ない順に返す",
};

export type Payoff = { loanId: string; name: string; date: string }; // date: YYYY-MM

export type StrategyResult = {
  key: StrategyKey;
  feasible: boolean;        // 600ヶ月以内にすべて完済できるか
  months: number;           // 全完済までの月数（要再計画はInfinity）
  finishDate: string | null;
  totalInterest: number;
  totalPayment: number;
  payoffs: Payoff[];        // 完済する順
};

const MAX_MONTHS = 600;

function ymOf(base: Date, m: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + m - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 追加返済・ロールオーバーを除いた、その月の予定返済額（残債+利息の上限は呼び出し側で適用）。
// buildSchedule の式と揃えてある（ズレは strategy.test.ts の「単独借入でbuildSchedule/calcStatsと一致」で検出する）
function scheduledPayment(loan: Loan, balance: number, interest: number, monthNum: number, withBonus: boolean): number {
  const bonus = withBonus && (loan.bonusMonths ?? []).includes(monthNum) ? (loan.bonusPayment ?? 0) : 0;
  if (loan.repayType === "revolving") {
    return Math.max(Math.ceil(balance * (loan.revolvingRate ?? 1) / 100), loan.revolvingMin ?? 5000);
  }
  if (loan.repayType === "principal_equal") {
    const principal = Math.min(loan.principalPerMonth ?? 0, balance);
    return principal > 0 ? principal + interest + bonus : interest; // 元金額が未設定なら利息のみ（＝減らない）
  }
  return loan.monthlyPayment + bonus;
}

type State = { loan: Loan; balance: number; grace: number; firstPay: number };

export function simulateStrategy(loans: Loan[], extraMonthly: number, key: StrategyKey): StrategyResult {
  const active = loans.filter((l) => l.currentBalance > 0);
  const base = new Date();

  if (key === "baseline") {
    const stats = active.map((l) => calcStats(l));
    const feasible = stats.every((s) => s.feasible);
    const payoffs = active
      .map((l) => {
        const sch = buildSchedule(l);
        return { loanId: l.id, name: l.name, date: sch.length ? sch[sch.length - 1].date : ymOf(base, 1) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const months = active.length === 0 ? 0 : Math.max(...stats.map((s) => s.monthsLeft));
    return {
      key,
      feasible,
      months,
      finishDate: feasible && payoffs.length ? payoffs[payoffs.length - 1].date : null,
      totalInterest: stats.reduce((s, x) => s + x.totalInterest, 0),
      totalPayment: stats.reduce((s, x) => s + x.totalPayment, 0),
      payoffs: feasible ? payoffs : [],
    };
  }

  const state: State[] = active.map((loan) => ({ loan, balance: loan.currentBalance, grace: remainingGraceMonths(loan, base), firstPay: 0 }));
  const payoffs: Payoff[] = [];
  let rolled = 0;          // 完済済みの借入から回ってくる月々の返済額
  let totalInterest = 0;
  let totalPayment = 0;
  let months = 0;

  for (let m = 1; m <= MAX_MONTHS; m++) {
    const alive = state.filter((s) => s.balance > 0);
    if (alive.length === 0) break;
    months = m;
    const ym = ymOf(base, m);
    const monthNum = Number(ym.slice(5));

    const rows = alive.map((s) => {
      const rate = rateAt(s.loan, `${ym}-${String(s.loan.paymentDay).padStart(2, "0")}`);
      const interest = Math.max(0, Math.floor(s.balance * rate / 100 / 12));
      const needed = s.balance + interest;
      const inGrace = m <= s.grace;
      const sched = inGrace ? interest : scheduledPayment(s.loan, s.balance, interest, monthNum, true);
      if (!inGrace && s.firstPay === 0) s.firstPay = Math.min(scheduledPayment(s.loan, s.balance, interest, monthNum, false), needed);
      return { s, rate, interest, needed, inGrace, pay: Math.min(sched, needed) };
    });

    // 追加返済＋回ってきた返済額を、優先順位の高い借入から充てる
    let pool = extraMonthly + rolled;
    const order = [...rows].sort((a, b) =>
      key === "avalanche" ? b.rate - a.rate || a.s.balance - b.s.balance : a.s.balance - b.s.balance || b.rate - a.rate);
    for (const r of order) {
      if (pool <= 0) break;
      const add = Math.min(pool, r.needed - r.pay);
      if (add > 0) { r.pay += add; pool -= add; }
    }

    for (const r of rows) {
      const principal = r.pay - r.interest;
      if (!r.inGrace && principal <= 0) continue; // 利息に届かない月は元本が減らない（buildSchedule と同じく計上しない）
      totalInterest += r.interest;
      totalPayment += r.pay;
      r.s.balance = Math.max(0, r.s.balance - principal);
      if (r.s.balance === 0) {
        payoffs.push({ loanId: r.s.loan.id, name: r.s.loan.name, date: ym });
        rolled += r.s.firstPay; // 次の月から、この借入の返済額を他へ回す
      }
    }
  }

  const feasible = state.every((s) => s.balance === 0);
  return {
    key,
    feasible,
    months: feasible ? months : Infinity,
    finishDate: feasible && months > 0 ? ymOf(base, months) : null,
    totalInterest: feasible ? totalInterest : Infinity,
    totalPayment: feasible ? totalPayment : Infinity,
    payoffs: feasible ? payoffs : [],
  };
}

// 今の時点で「最初に追加返済を充てる順」。完済済み(残高0)は除く
export function priorityOrder(loans: Loan[], key: Exclude<StrategyKey, "baseline">): Loan[] {
  const today = new Date().toISOString().slice(0, 10);
  const rate = (l: Loan) => rateAt(l, today);
  return loans
    .filter((l) => l.currentBalance > 0)
    .sort((a, b) => key === "avalanche"
      ? rate(b) - rate(a) || a.currentBalance - b.currentBalance
      : a.currentBalance - b.currentBalance || rate(b) - rate(a));
}
