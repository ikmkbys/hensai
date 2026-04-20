"use client";
import { useEffect, useMemo, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { buildSchedule, calcStats, fmtJPY } from "@/lib/calc";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export default function SimulatorPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanId, setLoanId] = useState<string>("");
  const [extra, setExtra] = useState<number>(0);
  const [lump, setLump] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const d = loadData();
    setLoans(d.loans);
    if (d.loans[0]) setLoanId(d.loans[0].id);
    setMounted(true);
  }, []);

  const loan = loans.find((l) => l.id === loanId);

  const { base, sim } = useMemo(() => {
    if (!loan) return { base: [], sim: [] };
    const baseSch = buildSchedule(loan);
    const simLoan: Loan = {
      ...loan,
      currentBalance: Math.max(0, loan.currentBalance - lump),
      monthlyPayment: loan.monthlyPayment + extra,
    };
    const simSch = buildSchedule(simLoan);
    return { base: baseSch, sim: simSch };
  }, [loan, extra, lump]);

  const chartData = useMemo(() => {
    const len = Math.max(base.length, sim.length);
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < len; i++) {
      rows.push({
        month: i + 1,
        現状: base[i]?.balance ?? 0,
        シミュレーション: sim[i]?.balance ?? 0,
      });
    }
    return rows;
  }, [base, sim]);

  if (!mounted) return null;

  if (loans.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">先に借入を登録してください。</div>;
  }

  const baseStats = loan ? calcStats(loan) : null;
  const simStats = loan ? calcStats({ ...loan, currentBalance: Math.max(0, loan.currentBalance - lump), monthlyPayment: loan.monthlyPayment + extra }) : null;

  const savedInterest = baseStats && simStats && baseStats.feasible && simStats.feasible
    ? baseStats.totalInterest - simStats.totalInterest : 0;
  const savedMonths = baseStats && simStats && baseStats.feasible && simStats.feasible
    ? baseStats.monthsLeft - simStats.monthsLeft : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">繰上げ返済シミュレーター</h1>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">対象の借入</span>
          <select className={input} value={loanId} onChange={(e) => setLoanId(e.target.value)}>
            {loans.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">月次追加返済（円）</span>
          <input type="number" min={0} className={input} value={extra || ""} onChange={(e) => setExtra(Number(e.target.value))} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">一括返済（円）</span>
          <input type="number" min={0} className={input} value={lump || ""} onChange={(e) => setLump(Number(e.target.value))} />
        </label>
      </section>

      {loan && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="短縮期間" value={savedMonths > 0 ? `${savedMonths}ヶ月` : "—"} tone="emerald" />
            <Stat label="利息削減額" value={savedInterest > 0 ? fmtJPY(savedInterest) : "—"} tone="emerald" />
            <Stat label="新・完済予定" value={simStats?.feasible ? (simStats.finishDate ?? "—") : "要再計画"} tone="indigo" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">残高推移の比較</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: "ヶ月", position: "insideBottomRight", offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v: number) => fmtJPY(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="現状" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="シミュレーション" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Stat({ label, value, tone }: { label: string; value: string; tone: "indigo" | "emerald" }) {
  const bg = { indigo: "bg-indigo-600", emerald: "bg-emerald-600" }[tone];
  return (
    <div className={`rounded-2xl ${bg} p-5 text-white`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
