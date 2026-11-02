import { describe, expect, it } from "vitest";
import { fromCSV, toCSV } from "./csv";
import { makeLoan } from "./testUtil";

describe("CSV の書き出し→読み込み", () => {
  it("借入1件が往復で同じ内容に戻る（返済・金利変更履歴含む）", () => {
    const loan = makeLoan({
      repayType: "principal_equal",
      principalPerMonth: 10000,
      bonusPayment: 30000,
      bonusMonths: [6, 12],
      payments: [{ id: "p1", date: "2026-03-27", amount: 11200, note: "3月分", interestPart: 1200, principalPart: 10000 }],
      rateChanges: [{ id: "r1", date: "2026-06-01", annualRate: 2.5 }],
    });
    const [back] = fromCSV(toCSV([loan]));
    // 読み込み時に charges が [] で補われ、未設定のリボ項目は undefined になる以外は同一
    expect({ ...back, charges: undefined, revolvingRate: undefined, revolvingMin: undefined }).toEqual({
      ...loan, charges: undefined, revolvingRate: undefined, revolvingMin: undefined,
    });
    expect(back.charges).toEqual([]);
  });
  it("カンマ・引用符・改行を含むメモも壊れない", () => {
    const loan = makeLoan({ name: "A,B", note: "1行目\n2行目 \"引用\"" });
    const [back] = fromCSV(toCSV([loan]));
    expect(back.name).toBe("A,B");
    expect(back.note).toBe("1行目\n2行目 \"引用\"");
  });
  it("リボ払いの設定が往復で保たれる", () => {
    const loan = makeLoan({ repayType: "revolving", revolvingRate: 2, revolvingMin: 10000 });
    const [back] = fromCSV(toCSV([loan]));
    expect(back.repayType).toBe("revolving");
    expect(back.revolvingRate).toBe(2);
    expect(back.revolvingMin).toBe(10000);
  });
  it("据置期間が往復で保たれる", () => {
    const loan = makeLoan({ gracePeriodMonths: 6 });
    expect(fromCSV(toCSV([loan]))[0].gracePeriodMonths).toBe(6);
  });
  it("複数件の順序が保たれる", () => {
    const loans = [makeLoan({ id: "a", name: "A" }), makeLoan({ id: "b", name: "B" })];
    expect(fromCSV(toCSV(loans)).map((l) => l.id)).toEqual(["a", "b"]);
  });
});

describe("CSV 読み込みの防御", () => {
  it("先頭のBOMがあっても読める", () => {
    const loan = makeLoan();
    expect(fromCSV("﻿" + toCSV([loan]))).toHaveLength(1);
  });
  it("CRLF改行(Excel保存)でも読める", () => {
    const csv = toCSV([makeLoan({ id: "a" }), makeLoan({ id: "b" })]).replace(/\n/g, "\r\n");
    expect(fromCSV(csv).map((l) => l.id)).toEqual(["a", "b"]);
  });
  it("id が空の行はスキップ", () => {
    const csv = toCSV([makeLoan({ id: "" })]);
    expect(fromCSV(csv)).toEqual([]);
  });
  it("ヘッダのみ・空文字は空配列", () => {
    expect(fromCSV("")).toEqual([]);
    expect(fromCSV(toCSV([]))).toEqual([]);
  });
  it("未知の返済方式は元利均等にフォールバック", () => {
    const csv = toCSV([makeLoan()]).replace(",fixed,", ",unknown,");
    expect(fromCSV(csv)[0].repayType).toBe("fixed");
  });
  it("壊れたJSON列は空配列として扱い、読み込み自体は失敗しない", () => {
    const csv = toCSV([makeLoan({ payments: [{ id: "p", date: "2026-01-01", amount: 1, note: "" }] })]).replace("[{", "[{{");
    expect(fromCSV(csv)[0].payments).toEqual([]);
  });
});
