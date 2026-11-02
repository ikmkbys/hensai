import { Loan } from "./types";

const LAST_KEY = "hensai.last-backup";       // 最後にCSVエクスポートした日時(ISO)
const SNOOZE_KEY = "hensai.backup-snooze";   // この日時まで催促しない(ISO)

export const BACKUP_INTERVAL_DAYS = 30;      // この日数を超えたら促す
const FIRST_GRACE_DAYS = 7;                  // 登録直後(最古の借入がこの日数未満)は促さない
const SNOOZE_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; } // プライベートモード等では保存できないだけなので黙って無視
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* 同上 */ }
}

export function getLastBackup(): string | null { return read(LAST_KEY); }
export function getBackupSnooze(): string | null { return read(SNOOZE_KEY); }
export function markBackup(now = new Date()) { write(LAST_KEY, now.toISOString()); }
export function snoozeBackup(now = new Date()) { write(SNOOZE_KEY, new Date(now.getTime() + SNOOZE_DAYS * DAY).toISOString()); }

// 最後のバックアップからの経過日数。バックアップ履歴が無ければ null
export function daysSinceBackup(lastBackup: string | null, now = new Date()): number | null {
  if (!lastBackup) return null;
  const t = Date.parse(lastBackup);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}

// バックアップを促すか。借入があり、(最終バックアップから30日超) または (一度も取らないまま登録から7日超) で、スヌーズ中でないとき
export function shouldRemindBackup(loans: Loan[], lastBackup: string | null, snoozeUntil: string | null, now = new Date()): boolean {
  if (loans.length === 0) return false;
  if (snoozeUntil) {
    const s = Date.parse(snoozeUntil);
    if (!Number.isNaN(s) && s > now.getTime()) return false;
  }
  const since = daysSinceBackup(lastBackup, now);
  if (since !== null) return since >= BACKUP_INTERVAL_DAYS;
  const oldest = Math.min(...loans.map((l) => Date.parse(l.createdAt)).filter((t) => !Number.isNaN(t)));
  if (!Number.isFinite(oldest)) return true; // 登録日が読めない場合は安全側に倒して促す
  return now.getTime() - oldest >= FIRST_GRACE_DAYS * DAY;
}
