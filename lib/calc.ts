import { Loan, RateChange } from "./types";

export type ScheduleRow = {
  month: number;
  date: string;           // YYYY-MM
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  rate: number;           // その月の年利（%）
};

// 指定年月(YYYY-MM-DD)時点で適用される年利を返す
export function rateAt(loan: Loan, dateStr: string): number {
  const changes = [...(loan.rateChanges ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  let current = loan.annualRate;
  for (const c of changes) {
    if (c.date <= dateStr) current = c.annualRate;
    else break;
  }
  return current;
}

export function buildSchedule(loan: Loan, maxMonths = 600, extraMonthly = 0): ScheduleRow[] {
  let balance = loan.currentBalance;
  const isRevolving = loan.repayType === "revolving";
  const isPrincipalEqual = loan.repayType === "principal_equal";
  const revRate = (loan.revolvingRate ?? 1) / 100;
  const revMin = loan.revolvingMin ?? 5000;
  const bonusMonths = loan.bonusMonths ?? [];
  const rows: ScheduleRow[] = [];
  const base = new Date();

  // 残りの据置期間を月数で計算
  let remainingGrace = 0;
  if ((loan.gracePeriodMonths ?? 0) > 0 && loan.startDate) {
    const start = new Date(loan.startDate);
    const graceEnd = new Date(start.getFullYear(), start.getMonth() + loan.gracePeriodMonths!, 0);
    const now = new Date(base.getFullYear(), base.getMonth(), 1);
    if (graceEnd > now) {
      remainingGrace = (graceEnd.getFullYear() - now.getFullYear()) * 12 + (graceEnd.getMonth() - now.getMonth()) + 1;
    }
  }

  for (let m = 1; m <= maxMonths && balance > 0; m++) {
    const d = new Date(base.getFullYear(), base.getMonth() + m - 1, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthNum = d.getMonth() + 1;
    const yearRate = rateAt(loan, `${ym}-${String(loan.paymentDay).padStart(2, "0")}`);
    const mRate = yearRate / 100 / 12;
    const interest = Math.max(0, Math.floor(balance * mRate));
    const needed = balance + interest;
    const isBonus = bonusMonths.includes(monthNum);
    const bonusExtra = isBonus ? (loan.bonusPayment ?? 0) : 0;

    // 据置期間中は利息のみ
    if (m <= remainingGrace) {
      rows.push({ month: m, date: ym, payment: interest, interest, principal: 0, balance, rate: yearRate });
      continue;
    }

    let payment: number;
    if (isRevolving) {
      payment = Math.min(Math.max(Math.ceil(balance * revRate), revMin) + extraMonthly, needed);
    } else if (isPrincipalEqual) {
      const principalFixed = Math.min((loan.principalPerMonth ?? 0) + extraMonthly, balance);
      if (principalFixed <= 0) break;
      payment = Math.min(principalFixed + interest + bonusExtra, needed);
    } else {
      payment = Math.min(loan.monthlyPayment + bonusExtra + extraMonthly, needed);
    }
    const principal = payment - interest;
    if (principal <= 0) break;
    balance = Math.max(0, balance - principal);
    rows.push({ month: m, date: ym, payment, interest, principal, balance, rate: yearRate });
  }
  return rows;
}

export type LoanStats = {
  monthsLeft: number;
  finishDate: string | null;
  totalInterest: number;
  totalPayment: number;
  feasible: boolean;
};

export function calcStats(loan: Loan, extraMonthly = 0): LoanStats {
  const sch = buildSchedule(loan, 600, extraMonthly);
  const last = sch[sch.length - 1];
  // スケジュールが組めない（支払いが利息に届かない等）か600ヶ月以内に完済しない場合は「要再計画」
  if (loan.currentBalance > 0 && (!last || last.balance > 0)) {
    return { monthsLeft: Infinity, finishDate: null, totalInterest: Infinity, totalPayment: Infinity, feasible: false };
  }
  const totalInterest = sch.reduce((s, r) => s + r.interest, 0);
  const totalPayment = sch.reduce((s, r) => s + r.payment, 0);
  return {
    monthsLeft: sch.length,
    finishDate: last ? last.date : null,
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    feasible: true,
  };
}

export function fmtJPY(n: number): string {
  if (!isFinite(n)) return "∞";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function progressPct(loan: Loan): number {
  if (loan.principal <= 0) return 0;
  const paid = loan.principal - loan.currentBalance;
  return Math.max(0, Math.min(100, (paid / loan.principal) * 100));
}

// 今月分の返済が記録済みかチェック
export function isPaidThisMonth(loan: Loan, ref = new Date()): boolean {
  const ym = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  return (loan.payments ?? []).some((p) => p.date.startsWith(ym));
}

// 今月の返済日を過ぎているか
export function isPaymentDuePast(loan: Loan, ref = new Date()): boolean {
  return ref.getDate() >= (loan.paymentDay || 1);
}

export function sortRateChanges(list: RateChange[]): RateChange[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

export function currentMonthPayment(loan: Loan): number {
  const today = new Date().toISOString().slice(0, 10);
  const rate = rateAt(loan, today);
  const interest = Math.floor(loan.currentBalance * (rate / 100 / 12));

  // 据置期間中は利息のみ
  if ((loan.gracePeriodMonths ?? 0) > 0 && loan.startDate) {
    const start = new Date(loan.startDate);
    const now = new Date();
    const elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (elapsed < loan.gracePeriodMonths!) return interest;
  }

  const monthNum = new Date().getMonth() + 1;
  const bonusExtra = (loan.bonusMonths ?? []).includes(monthNum) ? (loan.bonusPayment ?? 0) : 0;
  if (loan.repayType === "revolving") {
    const payment = Math.max(Math.ceil(loan.currentBalance * (loan.revolvingRate ?? 1) / 100), loan.revolvingMin ?? 5000);
    return Math.min(payment, loan.currentBalance + interest);
  }
  if (loan.repayType === "principal_equal") {
    return Math.min((loan.principalPerMonth ?? 0) + interest + bonusExtra, loan.currentBalance + interest);
  }
  return Math.min(loan.monthlyPayment + bonusExtra, loan.currentBalance + interest); // 完済間際・完済後は残債分まで
}

export function calcTotalPaid(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + (l.payments ?? []).reduce((s, p) => s + p.amount, 0), 0);
}

export function calcConsecutiveMonths(loans: Loan[]): number {
  const ref = new Date();
  let count = 0;
  for (let i = 0; i < 120; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hasPay = loans.some((l) => (l.payments ?? []).some((p) => p.date.startsWith(ym)));
    if (hasPay) count++;
    else if (i === 0) continue; // 今月は返済日前で未記録の可能性があるため連続を切らない
    else break;
  }
  return count;
}

// 返済額を元金/利息に分解する。その日時点の金利と残高から利息を先に算定し、残りを元金返済とみなす
export function splitPayment(loan: Loan, dateStr: string, amount: number): { interestPart: number; principalPart: number } {
  const yearRate = rateAt(loan, dateStr);
  const interest = Math.max(0, Math.floor(loan.currentBalance * (yearRate / 100 / 12)));
  const cappedInterest = Math.min(interest, amount);              // 返済額が利息未満なら利息は返済額が上限
  const principalPart = Math.max(0, Math.min(amount - cappedInterest, loan.currentBalance)); // 元金は残高が上限
  return { interestPart: cappedInterest, principalPart };
}
