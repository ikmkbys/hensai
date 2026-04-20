"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadData, newId, upsertLoan } from "@/lib/storage";
import { Loan, Payment } from "@/lib/types";
import { buildSchedule, calcConsecutiveMonths, calcStats, calcTotalPaid, currentMonthPayment, fmtJPY, isPaidThisMonth, isPaymentDuePast, progressPct, splitPayment } from "@/lib/calc";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import BackupNoticeModal from "@/components/BackupNoticeModal";

export default function HomePage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [mounted, setMounted] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState(0);

  useEffect(() => {
    setLoans(loadData().loans);
    setMounted(true);
  }, []);

  function quickRecord(loan: Loan) {
    if (payAmount <= 0) return;
    const { interestPart, principalPart } = splitPayment(loan, payDate, payAmount);
    const p: Payment = { id: newId(), date: payDate, amount: payAmount, note: "", interestPart, principalPart };
    const updated: Loan = {
      ...loan,
      payments: [...(loan.payments ?? []), p],
      currentBalance: Math.max(0, loan.currentBalance - principalPart),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    setLoans((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    setPayingId(null);
  }

  const totalBalance = loans.reduce((s, l) => s + l.currentBalance, 0);
  const totalMonthly = loans.reduce((s, l) => s + currentMonthPayment(l), 0);
  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const paid = Math.max(0, totalPrincipal - totalBalance);
  const pct = totalPrincipal > 0 ? (paid / totalPrincipal) * 100 : 0;
  const totalPaid = calcTotalPaid(loans);
  const consecutiveMonths = calcConsecutiveMonths(loans);

  const finishDate = useMemo(() => {
    let latest: string | null = null;
    for (const l of loans) {
      const s = calcStats(l);
      if (!s.feasible) return "再計画が必要";
      if (s.finishDate && (!latest || s.finishDate > latest)) latest = s.finishDate;
    }
    return latest ?? "—";
  }, [loans]);

  const pieData = loans.map((l) => ({ name: l.name, value: l.currentBalance, color: l.color }));

  const trendData = useMemo(() => {
    if (loans.length === 0) return [];
    const perLoan = loans.map((l) => buildSchedule(l));
    const maxLen = Math.max(...perLoan.map((s) => s.length));
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      let total = 0;
      let date = "";
      loans.forEach((l, idx) => {
        const r = perLoan[idx][i];
        if (r) { total += r.balance; date = r.date; }
      });
      rows.push({ date, 残高: total });
    }
    return rows;
  }, [loans]);

  if (!mounted) return null;

  if (loans.length === 0) {
    return (
      <>
        <BackupNoticeModal />
        <div className="grid place-items-center py-16 text-center">
        <div className="max-w-md">
          <div className="mb-6 text-6xl">🎯</div>
          <h1 className="mb-3 text-2xl font-bold">前向きに、クリアしていこう</h1>
          <p className="mb-8 text-slate-600">
            借入を登録すると、残高・返済予定・完済日が一目でわかります。<br />
            データはこの端末にしか保存されません。
          </p>
          <Link
            href="/loans/new"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            最初の借入を登録する
          </Link>
        </div>
      </div>
      </>
    );
  }

  const unpaid = loans.filter((l) => l.currentBalance > 0 && !isPaidThisMonth(l) && isPaymentDuePast(l));

  return (
    <div className="space-y-6">
      <BackupNoticeModal />
      {unpaid.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>今月の返済記録を忘れずに（{unpaid.length} 件）</span>
          <Link href={`/loans/${unpaid[0].id}`} className="font-medium underline">記録する →</Link>
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="総残高" value={fmtJPY(totalBalance)} tone="indigo" />
        <Stat label="月次返済合計" value={fmtJPY(totalMonthly)} tone="slate" />
        <Stat label="完済予定" value={finishDate} tone="emerald" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">全体の進捗</h2>
          <span className="text-sm text-slate-500">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          返済済み {fmtJPY(paid)} / 当初合計 {fmtJPY(totalPrincipal)}
        </p>
        <div className="mt-3 flex gap-6 border-t border-slate-100 pt-3">
          <div>
            <div className="text-xs text-slate-500">累計返済額</div>
            <div className="mt-0.5 font-semibold tabular-nums">{fmtJPY(totalPaid)}</div>
          </div>
          {consecutiveMonths > 0 && (
            <div>
              <div className="text-xs text-slate-500">連続返済</div>
              <div className="mt-0.5 font-semibold tabular-nums">{consecutiveMonths}ヶ月継続中 🔥</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">残高内訳</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color || "#6366f1"} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtJPY(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">残高推移（予測）</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                <Tooltip formatter={(v) => fmtJPY(v as number)} />
                <Legend />
                <Line type="monotone" dataKey="残高" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">借入一覧</h2>
          <Link href="/loans/new" className="text-sm text-indigo-600 hover:underline">+ 新規追加</Link>
        </div>
        <div className="space-y-2">
          {loans.map((l) => {
            const isOpen = payingId === l.id;
            return (
              <div key={l.id} className="overflow-hidden rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 p-3 transition hover:bg-indigo-50/30">
                  <Link href={`/loans/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-8 w-2 flex-shrink-0 rounded-full" style={{ background: l.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.name}</div>
                      <div className="text-xs text-slate-500">{l.lender}・年利 {l.annualRate}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{fmtJPY(l.currentBalance)}</div>
                      <div className="text-xs text-slate-500">{progressPct(l).toFixed(0)}% 完了</div>
                    </div>
                  </Link>
                  {l.currentBalance > 0 && (
                    <button
                      onClick={() => {
                        if (isOpen) { setPayingId(null); return; }
                        setPayingId(l.id);
                        setPayAmount(currentMonthPayment(l));
                        setPayDate(new Date().toISOString().slice(0, 10));
                      }}
                      className={`ml-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isOpen ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                    >
                      {isOpen ? "×" : "記録"}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-slate-600">日付</span>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={miniInput} />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-slate-600">金額（円）</span>
                        <input type="number" min={0} value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} className={miniInput} />
                      </label>
                      <button onClick={() => quickRecord(l)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700">
                        記録する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <p className="text-center text-xs text-slate-400">
        💾 データはこの端末のブラウザにのみ保存されます。{" "}
        <Link href="/settings" className="underline hover:text-slate-600">定期的なCSVバックアップ</Link>をおすすめします。
      </p>
    </div>
  );
}

const miniInput = "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Stat({ label, value, tone }: { label: string; value: string; tone: "indigo" | "slate" | "emerald" }) {
  const bg = { indigo: "bg-indigo-600", slate: "bg-slate-700", emerald: "bg-emerald-600" }[tone];
  return (
    <div className={`rounded-2xl ${bg} p-5 text-white shadow-sm`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
