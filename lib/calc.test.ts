import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSchedule, calcConsecutiveMonths, calcStats, calcTotalPaid, currentMonthPayment,
  fmtJPY, isPaidThisMonth, isPaymentDuePast, progressPct, rateAt, splitPayment,
} from "./calc";
import { makeLoan } from "./testUtil";

// buildSchedule等は new Date() を基準にするため、2026-04-20 に固定する
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0)); });
afterEach(() => { vi.useRealTimers(); });

describe("rateAt", () => {
  it("金利変更が無ければ初期金利", () => {
    expect(rateAt(makeLoan({ annualRate: 3 }), "2030-01-01")).toBe(3);
  });
  it("変更日(当日を含む)以降は新金利、前は旧金利", () => {
    const loan = makeLoan({ annualRate: 1, rateChanges: [{ id: "a", date: "2026-06-27", annualRate: 2 }] });
    expect(rateAt(loan, "2026-06-26")).toBe(1);
    expect(rateAt(loan, "2026-06-27")).toBe(2);
  });
  it("登録順が前後していても日付順で判定する", () => {
    const loan = makeLoan({
      annualRate: 1,
      rateChanges: [
        { id: "b", date: "2027-01-01", annualRate: 3 },
        { id: "a", date: "2026-06-01", annualRate: 2 },
      ],
    });
    expect(rateAt(loan, "2026-12-31")).toBe(2);
    expect(rateAt(loan, "2027-01-01")).toBe(3);
  });
});

describe("buildSchedule: 元利均等", () => {
  // 10万円・年利12%(月利1%)・月1万円 → 手計算: 1回目 利息1000/元金9000/残91000、2回目 利息910/元金9090/残81910、3回目 利息819/元金9181/残72729
  const loan = makeLoan({ currentBalance: 100000, annualRate: 12, monthlyPayment: 10000 });

  it("先頭3行が手計算と一致する（利息は円未満切捨て）", () => {
    const rows = buildSchedule(loan);
    expect(rows.slice(0, 3).map((r) => [r.interest, r.principal, r.balance])).toEqual([
      [1000, 9000, 91000],
      [910, 9090, 81910],
      [819, 9181, 72729],
    ]);
  });
  it("起点は現在月(2026-04)", () => {
    expect(buildSchedule(loan)[0].date).toBe("2026-04");
  });
  it("11回で完済し、最終回は残債+利息までに丸められる", () => {
    const rows = buildSchedule(loan);
    expect(rows).toHaveLength(11);
    const last = rows[rows.length - 1];
    expect(last.balance).toBe(0);
    expect(last.payment).toBeLessThanOrEqual(10000);
  });
  it("元金の合計は借入残高に一致する", () => {
    const rows = buildSchedule(loan);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(100000);
  });
  it("月次追加返済で期間と総利息が減る", () => {
    const base = calcStats(loan);
    const fast = calcStats(loan, 5000);
    expect(fast.monthsLeft).toBeLessThan(base.monthsLeft);
    expect(fast.totalInterest).toBeLessThan(base.totalInterest);
  });
  it("残高0の借入はスケジュールが空", () => {
    expect(buildSchedule(makeLoan({ currentBalance: 0 }))).toEqual([]);
  });
});

describe("buildSchedule: 元金均等", () => {
  // 12万円・年利12%・毎月元金1万円 → 利息は1200,1100,...,100円。合計 0.01×(12+11+…+1)万円 = 7800円
  const loan = makeLoan({
    repayType: "principal_equal", principalPerMonth: 10000, currentBalance: 120000, annualRate: 12,
  });
  it("12回で完済し、毎回の元金が一定", () => {
    const rows = buildSchedule(loan);
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.principal === 10000)).toBe(true);
    expect(rows[0].payment).toBe(11200);
  });
  it("総利息は7,800円", () => {
    expect(calcStats(loan).totalInterest).toBe(7800);
  });
  it("元金額が未設定(0)ならスケジュールが組めず要再計画", () => {
    const s = calcStats({ ...loan, principalPerMonth: 0 });
    expect(s.feasible).toBe(false);
  });
});

describe("buildSchedule: リボ払い", () => {
  it("支払額=max(残高×支払率, 最低支払額)で、残高が減るほど最低額に張り付く", () => {
    const loan = makeLoan({ repayType: "revolving", currentBalance: 100000, annualRate: 15, revolvingRate: 5, revolvingMin: 5000 });
    const rows = buildSchedule(loan);
    expect(rows[0].payment).toBe(5000);
    expect(rows[0].interest).toBe(1250);
    expect(rows[0].principal).toBe(3750);
    expect(calcStats(loan).feasible).toBe(true);
  });
  it("支払額が利息に届かないリボは要再計画(∞)", () => {
    const loan = makeLoan({ repayType: "revolving", currentBalance: 500000, annualRate: 18, revolvingRate: 1, revolvingMin: 5000 });
    const s = calcStats(loan);
    expect(s.feasible).toBe(false);
    expect(s.finishDate).toBeNull();
    expect(s.monthsLeft).toBe(Infinity);
  });
});

describe("buildSchedule: 据置・ボーナス・金利変更", () => {
  it("据置期間中は利息のみで残高が減らない", () => {
    // 開始2026-04-01・据置3ヶ月 → 現在月(2026-04)から3回は利息のみ
    const loan = makeLoan({ gracePeriodMonths: 3, currentBalance: 100000, annualRate: 12 });
    const rows = buildSchedule(loan);
    expect(rows.slice(0, 3).every((r) => r.principal === 0 && r.balance === 100000 && r.payment === 1000)).toBe(true);
    expect(rows[3].principal).toBeGreaterThan(0);
  });
  it("ボーナス月だけ返済額が増える", () => {
    const loan = makeLoan({ currentBalance: 1000000, annualRate: 0, monthlyPayment: 10000, bonusPayment: 50000, bonusMonths: [6] });
    const rows = buildSchedule(loan);
    const june = rows.find((r) => r.date === "2026-06")!;
    const may = rows.find((r) => r.date === "2026-05")!;
    expect(may.payment).toBe(10000);
    expect(june.payment).toBe(60000);
  });
  it("金利変更日以降の行から新金利が使われる", () => {
    const loan = makeLoan({ annualRate: 12, rateChanges: [{ id: "a", date: "2026-06-01", annualRate: 24 }] });
    const rows = buildSchedule(loan);
    expect(rows.find((r) => r.date === "2026-05")!.rate).toBe(12);
    expect(rows.find((r) => r.date === "2026-06")!.rate).toBe(24);
  });
});

describe("calcStats", () => {
  it("住宅ローン3,000万円・年利1.2%・月9.5万円は、閉形式の解(約379.7ヶ月)と一致する", () => {
    const P = 30000000, M = 95000, r = 0.012 / 12;
    const nExact = -Math.log(1 - (P * r) / M) / Math.log(1 + r); // 元利均等の返済月数の理論値
    const s = calcStats(makeLoan({ principal: P, currentBalance: P, annualRate: 1.2, monthlyPayment: M }));
    expect(s.monthsLeft).toBe(Math.ceil(nExact)); // 380ヶ月 → 2026-04起点で2057-11
    expect(s.finishDate).toBe("2057-11");
    expect(Math.abs(s.totalInterest - (M * nExact - P))).toBeLessThan(1000); // 円未満切捨ての累積誤差の範囲
    expect(s.totalPayment).toBe(P + s.totalInterest);
  });
  it("月1万円が利息(月1,250円超)を下回らなければ完済でき、下回れば要再計画", () => {
    expect(calcStats(makeLoan({ currentBalance: 1000000, annualRate: 12, monthlyPayment: 5000 })).feasible).toBe(false);
    expect(calcStats(makeLoan({ currentBalance: 1000000, annualRate: 12, monthlyPayment: 20000 })).feasible).toBe(true);
  });
  it("600ヶ月で完済しなければ要再計画", () => {
    // 利息ちょうど+1円しか払えず、残高が減らない
    const s = calcStats(makeLoan({ currentBalance: 100000000, annualRate: 1.2, monthlyPayment: 100001 }));
    expect(s.feasible).toBe(false);
  });
  it("残高0なら即完済扱い", () => {
    const s = calcStats(makeLoan({ currentBalance: 0 }));
    expect(s.feasible).toBe(true);
    expect(s.monthsLeft).toBe(0);
  });
});

describe("splitPayment", () => {
  it("残高27,905,000円・年利1.2%に95,000円 → 利息27,905・元金67,095（2026-04-20の手動検証値）", () => {
    const loan = makeLoan({ currentBalance: 27905000, annualRate: 1.2 });
    expect(splitPayment(loan, "2026-04-20", 95000)).toEqual({ interestPart: 27905, principalPart: 67095 });
  });
  it("返済額が利息未満なら全額が利息で元金は0", () => {
    const loan = makeLoan({ currentBalance: 1000000, annualRate: 12 });
    expect(splitPayment(loan, "2026-04-20", 3000)).toEqual({ interestPart: 3000, principalPart: 0 });
  });
  it("残高を超える返済でも元金は残高が上限", () => {
    const loan = makeLoan({ currentBalance: 5000, annualRate: 0 });
    expect(splitPayment(loan, "2026-04-20", 99999)).toEqual({ interestPart: 0, principalPart: 5000 });
  });
  it("記録日の金利(金利変更後)で利息を計算する", () => {
    const loan = makeLoan({ currentBalance: 120000, annualRate: 12, rateChanges: [{ id: "a", date: "2026-04-01", annualRate: 24 }] });
    expect(splitPayment(loan, "2026-04-20", 10000).interestPart).toBe(2400);
  });
});

describe("currentMonthPayment", () => {
  it("元利均等は月額、完済間際は残債+利息まで", () => {
    expect(currentMonthPayment(makeLoan({ monthlyPayment: 10000 }))).toBe(10000);
    expect(currentMonthPayment(makeLoan({ currentBalance: 3000, annualRate: 0, monthlyPayment: 10000 }))).toBe(3000);
  });
  it("元金均等は元金+利息", () => {
    const loan = makeLoan({ repayType: "principal_equal", principalPerMonth: 10000, currentBalance: 120000, annualRate: 12 });
    expect(currentMonthPayment(loan)).toBe(11200);
  });
  it("リボは最低支払額を下回らない", () => {
    const loan = makeLoan({ repayType: "revolving", currentBalance: 20000, annualRate: 15, revolvingRate: 1, revolvingMin: 5000 });
    expect(currentMonthPayment(loan)).toBe(5000);
  });
  it("据置期間中は利息のみ", () => {
    const loan = makeLoan({ gracePeriodMonths: 3, currentBalance: 100000, annualRate: 12 });
    expect(currentMonthPayment(loan)).toBe(1000);
  });
});

describe("進捗・記録まわり", () => {
  it("progressPct は 0〜100 にクリップ", () => {
    expect(progressPct(makeLoan({ principal: 100, currentBalance: 25 }))).toBe(75);
    expect(progressPct(makeLoan({ principal: 100, currentBalance: 500 }))).toBe(0);
    expect(progressPct(makeLoan({ principal: 0, currentBalance: 0 }))).toBe(0);
  });
  it("isPaidThisMonth は今月の記録の有無で判定", () => {
    const paid = makeLoan({ payments: [{ id: "p", date: "2026-04-05", amount: 1, note: "" }] });
    const old = makeLoan({ payments: [{ id: "p", date: "2026-03-05", amount: 1, note: "" }] });
    expect(isPaidThisMonth(paid)).toBe(true);
    expect(isPaidThisMonth(old)).toBe(false);
  });
  it("isPaymentDuePast は返済日(20日)当日から true", () => {
    expect(isPaymentDuePast(makeLoan({ paymentDay: 20 }))).toBe(true);
    expect(isPaymentDuePast(makeLoan({ paymentDay: 21 }))).toBe(false);
  });
  it("calcTotalPaid は全借入の返済額の合計", () => {
    const a = makeLoan({ payments: [{ id: "1", date: "2026-03-01", amount: 100, note: "" }] });
    const b = makeLoan({ id: "l2", payments: [{ id: "2", date: "2026-03-01", amount: 250, note: "" }] });
    expect(calcTotalPaid([a, b])).toBe(350);
  });
  it("連続返済は今月未記録でも切れず、先月の欠けで止まる", () => {
    const pay = (date: string) => ({ id: date, date, amount: 1, note: "" });
    // 3月・2月に記録、今月(4月)は未記録 → 2ヶ月継続
    expect(calcConsecutiveMonths([makeLoan({ payments: [pay("2026-03-10"), pay("2026-02-10")] })])).toBe(2);
    // 4月・3月・1月 → 2月が欠けているので2
    expect(calcConsecutiveMonths([makeLoan({ payments: [pay("2026-04-10"), pay("2026-03-10"), pay("2026-01-10")] })])).toBe(2);
    expect(calcConsecutiveMonths([makeLoan()])).toBe(0);
  });
  it("fmtJPY は3桁区切りで、無限大は∞", () => {
    expect(fmtJPY(1234567)).toBe("¥1,234,567");
    expect(fmtJPY(Infinity)).toBe("∞");
  });
});
