import { describe, expect, it } from "vitest";
import { daysSinceBackup, shouldRemindBackup } from "./backup";
import { makeLoan } from "./testUtil";

const now = new Date("2026-05-01T00:00:00.000Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe("daysSinceBackup", () => {
  it("履歴が無い・壊れている場合は null", () => {
    expect(daysSinceBackup(null, now)).toBeNull();
    expect(daysSinceBackup("not-a-date", now)).toBeNull();
  });
  it("経過日数は切り捨て", () => {
    expect(daysSinceBackup(daysAgo(10), now)).toBe(10);
    expect(daysSinceBackup(new Date(now.getTime() - 10.9 * 86400000).toISOString(), now)).toBe(10);
  });
});

describe("shouldRemindBackup", () => {
  const loan = (createdDaysAgo: number) => makeLoan({ createdAt: daysAgo(createdDaysAgo) });

  it("借入が無ければ促さない", () => {
    expect(shouldRemindBackup([], null, null, now)).toBe(false);
  });
  it("最終バックアップから29日は促さず、30日で促す", () => {
    expect(shouldRemindBackup([loan(100)], daysAgo(29), null, now)).toBe(false);
    expect(shouldRemindBackup([loan(100)], daysAgo(30), null, now)).toBe(true);
  });
  it("一度もバックアップが無い場合、登録から7日未満は促さず、7日で促す", () => {
    expect(shouldRemindBackup([loan(6)], null, null, now)).toBe(false);
    expect(shouldRemindBackup([loan(7)], null, null, now)).toBe(true);
  });
  it("複数の借入では最も古い登録日で判定する", () => {
    expect(shouldRemindBackup([loan(1), loan(40)], null, null, now)).toBe(true);
  });
  it("スヌーズ中は促さず、期限が過ぎれば再び促す", () => {
    const future = new Date(now.getTime() + 86400000).toISOString();
    const past = new Date(now.getTime() - 86400000).toISOString();
    expect(shouldRemindBackup([loan(100)], daysAgo(60), future, now)).toBe(false);
    expect(shouldRemindBackup([loan(100)], daysAgo(60), past, now)).toBe(true);
  });
  it("登録日が読めない借入しか無ければ安全側で促す", () => {
    expect(shouldRemindBackup([makeLoan({ createdAt: "broken" })], null, null, now)).toBe(true);
  });
});
