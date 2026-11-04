"use client";
import { useEffect, useMemo, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { buildSchedule, calcStats, fmtJPY } from "@/lib/calc";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { axisTick, chartGrid, legendProps, tooltipStyle } from "@/lib/chartTheme";

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
    };
    const simSch = buildSchedule(simLoan, 600, extra); // extraMonthly経由なら元金均等・リボにも追加返済が効く
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
    return <div className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-muted">先に借入を登録してください。</div>;
  }

  const baseStats = loan ? calcStats(loan) : null;
  const simStats = loan ? calcStats({ ...loan, currentBalance: Math.max(0, loan.currentBalance - lump) }, extra) : null;

  const savedInterest = baseStats && simStats && baseStats.feasible && simStats.feasible
    ? baseStats.totalInterest - simStats.totalInterest : 0;
  const savedMonths = baseStats && simStats && baseStats.feasible && simStats.feasible
    ? baseStats.monthsLeft - simStats.monthsLeft : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-title font-bold">繰上げ返済シミュレーター</h1>

      <section className="grid gap-4 rounded-card border border-border bg-surface p-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-meta font-medium">対象の借入</span>
          <select className={input} value={loanId} onChange={(e) => setLoanId(e.target.value)}>
            {loans.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-meta font-medium">月次追加返済（円）</span>
          <input type="number" min={0} className={input} value={extra || ""} onChange={(e) => setExtra(Number(e.target.value))} />
        </label>
        <label className="block">
          <span className="mb-1 block text-meta font-medium">一括返済（円）</span>
          <input type="number" min={0} className={input} value={lump || ""} onChange={(e) => setLump(Number(e.target.value))} />
        </label>
      </section>

      {loan && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="短縮期間" value={savedMonths > 0 ? `${savedMonths}ヶ月` : "—"} />
            <Stat label="利息削減額" value={savedInterest > 0 ? fmtJPY(savedInterest) : "—"} />
            <Stat label="新・完済予定" value={simStats?.feasible ? (simStats.finishDate ?? "—") : "要再計画"} />
          </section>

          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">残高推移の比較</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="month" tick={axisTick} label={{ value: "ヶ月", position: "insideBottomRight", offset: -2, fontSize: 10 }} />
                  <YAxis tick={axisTick} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v) => fmtJPY(v as number)} {...tooltipStyle} />
                  <Legend {...legendProps} />
                  <Line type="monotone" dataKey="現状" stroke="var(--chart-ref)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="シミュレーション" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 elevate-1">
      <div className="text-meta text-muted">{label}</div>
      <div className="mt-1 text-title font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
