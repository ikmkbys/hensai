"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { calcStats, currentMonthPayment, fmtJPY, progressPct } from "@/lib/calc";

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLoans(loadData().loans);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-title font-bold">借入一覧</h1>
        <Link href="/loans/new" className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85">
          + 新規追加
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
          まだ借入が登録されていません
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {loans.map((l) => {
            const s = calcStats(l);
            return (
              <Link
                key={l.id}
                href={`/loans/${l.id}`}
                className="block rounded-card border border-border bg-surface p-5 transition hover:border-accent/50 hover:elevate-2"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-control" style={{ background: l.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.name}</div>
                    <div className="text-meta text-muted">{l.lender || "借入先未設定"}</div>
                  </div>
                </div>
                <div className="mb-2 text-section font-bold tabular-nums">{fmtJPY(l.currentBalance)}</div>
                <div className="mb-3 h-2 overflow-hidden rounded-pill bg-surface-raised">
                  <div className="h-full rounded-pill" style={{ width: `${progressPct(l)}%`, background: l.color }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-meta">
                  <Info label="年利" value={`${l.annualRate}%`} />
                  <Info label="月々" value={fmtJPY(currentMonthPayment(l))} />
                  <Info label="完済" value={s.feasible ? (s.finishDate ?? "—") : "要再計画"} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
