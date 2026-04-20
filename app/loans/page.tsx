"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { calcStats, fmtJPY, progressPct } from "@/lib/calc";

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
        <h1 className="text-xl font-bold">借入一覧</h1>
        <Link href="/loans/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + 新規追加
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
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
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg" style={{ background: l.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.name}</div>
                    <div className="text-xs text-slate-500">{l.lender || "借入先未設定"}</div>
                  </div>
                </div>
                <div className="mb-2 text-2xl font-bold tabular-nums">{fmtJPY(l.currentBalance)}</div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${progressPct(l)}%`, background: l.color }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Info label="年利" value={`${l.annualRate}%`} />
                  <Info label="月々" value={fmtJPY(l.monthlyPayment)} />
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
      <div className="text-slate-400">{label}</div>
      <div className="font-medium text-slate-700">{value}</div>
    </div>
  );
}
