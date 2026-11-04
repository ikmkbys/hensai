"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loan } from "@/lib/types";
import { daysSinceBackup, getBackupSnooze, getLastBackup, shouldRemindBackup, snoozeBackup } from "@/lib/backup";
import { HardDrive } from "lucide-react";

export default function BackupReminder({ loans }: { loans: Loan[] }) {
  const [show, setShow] = useState(false);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const last = getLastBackup();
    setDays(daysSinceBackup(last));
    setShow(shouldRemindBackup(loans, last, getBackupSnooze()));
  }, [loans]);

  if (!show) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-accent/30 bg-accent-dim p-4 text-meta text-accent">
      <span>
        <HardDrive className="mr-1 inline h-4 w-4 align-text-bottom" />
        {days === null ? "まだバックアップを取っていません。" : `最後のバックアップから${days}日たちました。`}
        データはこの端末にしか無いので、CSVで控えておくと安心です。
      </span>
      <span className="flex items-center gap-3">
        <Link href="/settings" className="font-medium underline">バックアップする →</Link>
        <button onClick={() => { snoozeBackup(); setShow(false); }} className="text-accent/70 hover:text-accent">あとで</button>
      </span>
    </div>
  );
}
