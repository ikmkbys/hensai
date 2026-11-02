import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calcStats } from "./calc";
import { priorityOrder, simulateStrategy } from "./strategy";
import { makeLoan } from "./testUtil";
import { Loan } from "./types";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0)); });
afterEach(() => { vi.useRealTimers(); });

describe("単独の借入では、追加なしの試算が calcStats と一致する（式のズレ検出）", () => {
  const cases: [string, Loan][] = [
    ["元利均等", makeLoan({ currentBalance: 500000, annualRate: 12, monthlyPayment: 20000 })],
    ["元金均等", makeLoan({ repayType: "principal_equal", principalPerMonth: 10000, currentBalance: 120000, annualRate: 12 })],
    ["リボ", makeLoan({ repayType: "revolving", currentBalance: 100000, annualRate: 15, revolvingRate: 5, revolvingMin: 5000 })],
    ["据置あり", makeLoan({ gracePeriodMonths: 3, currentBalance: 100000, annualRate: 12, monthlyPayment: 20000 })],
    ["ボーナス払い", makeLoan({ currentBalance: 800000, annualRate: 6, monthlyPayment: 20000, bonusPayment: 100000, bonusMonths: [6, 12] })],
    ["金利変更あり", makeLoan({ currentBalance: 600000, annualRate: 6, monthlyPayment: 20000, rateChanges: [{ id: "a", date: "2026-08-01", annualRate: 12 }] })],
  ];
  for (const [name, loan] of cases) {
    for (const key of ["avalanche", "snowball"] as const) {
      it(`${name}（${key}）`, () => {
        const expected = calcStats(loan);
        const r = simulateStrategy([loan], 0, key);
        expect(r.feasible).toBe(true);
        expect(r.months).toBe(expected.monthsLeft);
        expect(r.finishDate).toBe(expected.finishDate);
        expect(r.totalInterest).toBe(expected.totalInterest);
        expect(r.totalPayment).toBe(expected.totalPayment);
      });
    }
  }
  it("要再計画の借入は追加なしだと要再計画のまま", () => {
    const loan = makeLoan({ repayType: "revolving", currentBalance: 500000, annualRate: 18, revolvingRate: 1, revolvingMin: 5000 });
    expect(simulateStrategy([loan], 0, "avalanche").feasible).toBe(false);
    expect(simulateStrategy([loan], 0, "baseline").feasible).toBe(false);
  });
});

describe("複数の借入", () => {
  // A: 高金利・残高大 / B: 低金利・残高小
  const A = makeLoan({ id: "A", name: "カードローン", currentBalance: 500000, annualRate: 18, monthlyPayment: 20000 });
  const B = makeLoan({ id: "B", name: "奨学金", currentBalance: 100000, annualRate: 3, monthlyPayment: 10000 });

  it("元金の合計＋利息 ＝ 支払総額（お金の出入りが合う）", () => {
    for (const key of ["baseline", "avalanche", "snowball"] as const) {
      const r = simulateStrategy([A, B], 10000, key);
      expect(r.feasible).toBe(true);
      expect(Math.abs(r.totalPayment - (600000 + r.totalInterest))).toBeLessThanOrEqual(1);
    }
  });
  it("高金利の借入が大きいとき、金利順の総利息 < 残高順 < 追加なし", () => {
    const base = simulateStrategy([A, B], 10000, "baseline");
    const ava = simulateStrategy([A, B], 10000, "avalanche");
    const snow = simulateStrategy([A, B], 10000, "snowball");
    expect(ava.totalInterest).toBeLessThan(snow.totalInterest);
    expect(snow.totalInterest).toBeLessThan(base.totalInterest);
    expect(ava.months).toBeLessThanOrEqual(base.months);
  });
  it("追加ゼロでも、完済した借入の返済額が回るぶん現状より早く終わる", () => {
    const base = simulateStrategy([A, B], 0, "baseline");
    const ava = simulateStrategy([A, B], 0, "avalanche");
    expect(ava.months).toBeLessThan(base.months);
    expect(ava.totalInterest).toBeLessThan(base.totalInterest);
  });
  it("追加返済が増えるほど総利息は減る", () => {
    const a = simulateStrategy([A, B], 5000, "avalanche").totalInterest;
    const b = simulateStrategy([A, B], 20000, "avalanche").totalInterest;
    expect(b).toBeLessThan(a);
  });
  it("完済順(payoffs)は日付昇順で、全借入が含まれる", () => {
    const r = simulateStrategy([A, B], 10000, "avalanche");
    expect(r.payoffs.map((p) => p.loanId).sort()).toEqual(["A", "B"]);
    const dates = r.payoffs.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
    expect(r.finishDate).toBe(dates[dates.length - 1]);
  });
  it("単独では完済できないリボも、他の借入が終わった返済額や追加返済が回れば完済できるようになる", () => {
    const revo = makeLoan({ id: "R", repayType: "revolving", currentBalance: 500000, annualRate: 18, revolvingRate: 1, revolvingMin: 5000 });
    expect(simulateStrategy([revo, B], 0, "baseline").feasible).toBe(false); // 今のままでは終わらない
    expect(simulateStrategy([revo, B], 0, "avalanche").feasible).toBe(true); // Bが終わると月1万円がリボに回る
    expect(simulateStrategy([revo], 0, "avalanche").feasible).toBe(false);
    expect(simulateStrategy([revo], 20000, "avalanche").feasible).toBe(true);
  });
});

describe("端の条件", () => {
  it("借入が無い・全部完済済みなら0ヶ月で終わる", () => {
    for (const key of ["baseline", "avalanche", "snowball"] as const) {
      const r = simulateStrategy([makeLoan({ currentBalance: 0 })], 10000, key);
      expect(r.feasible).toBe(true);
      expect(r.months).toBe(0);
      expect(r.finishDate).toBeNull();
    }
  });
  it("残高0の借入は優先順位に含めない", () => {
    const done = makeLoan({ id: "done", currentBalance: 0 });
    const live = makeLoan({ id: "live", currentBalance: 1000 });
    expect(priorityOrder([done, live], "avalanche").map((l) => l.id)).toEqual(["live"]);
  });
  it("priorityOrder: 金利順は高い順、残高順は小さい順（同点は他方で決める）", () => {
    const hi = makeLoan({ id: "hi", annualRate: 18, currentBalance: 500000 });
    const lo = makeLoan({ id: "lo", annualRate: 3, currentBalance: 100000 });
    const mid = makeLoan({ id: "mid", annualRate: 18, currentBalance: 200000 });
    expect(priorityOrder([lo, hi, mid], "avalanche").map((l) => l.id)).toEqual(["mid", "hi", "lo"]);
    expect(priorityOrder([hi, mid, lo], "snowball").map((l) => l.id)).toEqual(["lo", "mid", "hi"]);
  });
});
