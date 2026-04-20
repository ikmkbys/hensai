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

export function buildSchedule(loan: Loan, maxMonths = 600): ScheduleRow[] {
  let balance = loan.currentBalance;
  const isRevolving = loan.repayType === "revolving";
  const revRate = (loan.revolvingRate ?? 1) / 100;
  const revMin = loan.revolvingMin ?? 5000;
  const rows: ScheduleRow[] = [];
  const base = new Date();                 // 常に現在月を起点に表示する

  for (let m = 1; m <= maxMonths && balance > 0; m++) {
    const d = new Date(base.getFullYear(), base.getMonth() + m - 1, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const yearRate = rateAt(loan, `${ym}-${String(loan.paymentDay).padStart(2, "0")}`);
    const mRate = yearRate / 100 / 12;
    const interest = Math.max(0, Math.floor(balance * mRate));
    const needed = balance + interest;
    let payment: number;
    if (isRevolving) {
      payment = Math.min(Math.max(Math.ceil(balance * revRate), revMin), needed);
    } else {
      payment = Math.min(loan.monthlyPayment, needed);
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

export function calcStats(loan: Loan): LoanStats {
  const firstRate = rateAt(loan, new Date().toISOString().slice(0, 10));
  if (loan.repayType !== "revolving") {
    const firstInterest = loan.currentBalance * (firstRate / 100 / 12);
    if (loan.monthlyPayment <= firstInterest && loan.currentBalance > 0) {
      return {
        monthsLeft: Infinity,
        finishDate: null,
        totalInterest: Infinity,
        totalPayment: Infinity,
        feasible: false,
      };
    }
  }
  const sch = buildSchedule(loan);
  const totalInterest = sch.reduce((s, r) => s + r.interest, 0);
  const totalPayment = sch.reduce((s, r) => s + r.payment, 0);
  const last = sch[sch.length - 1];
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
  if (loan.repayType === "revolving") {
    const rate = rateAt(loan, new Date().toISOString().slice(0, 10));
    const interest = Math.floor(loan.currentBalance * (rate / 100 / 12));
    const payment = Math.max(Math.ceil(loan.currentBalance * (loan.revolvingRate ?? 1) / 100), loan.revolvingMin ?? 5000);
    return Math.min(payment, loan.currentBalance + interest);
  }
  return loan.monthlyPayment;
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
