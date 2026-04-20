"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoanForm from "@/components/LoanForm";
import { deleteLoan, getLoan, upsertLoan } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { buildSchedule, calcStats, currentMonthPayment, fmtJPY, isPaidThisMonth, isPaymentDuePast, progressPct } from "@/lib/calc";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import PaymentRecorder from "@/components/PaymentRecorder";
import RateChanges from "@/components/RateChanges";

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);

  useEffect(() => {
    setLoan(getLoan(params.id) ?? null);
  }, [params.id]);

  if (loan === undefined) return null;
  if (loan === null) return <div className="text-slate-500">見つかりませんでした。</div>;

  const stats = calcStats(loan);
  const schedule = buildSchedule(loan).slice(0, 60);
  const chartData = schedule.map((r) => ({ date: r.date, 元金: r.principal, 利息: r.interest }));
  const pct = progressPct(loan);
  const reachedMilestones = [25, 50, 75].filter((m) => pct >= m);
  const totalLoanPaid = (loan.payments ?? []).reduce((s, p) => s + p.amount, 0);

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">借入を編集</h1>
          <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:underline">キャンセル</button>
        </div>
        <LoanForm
          initial={loan}
          submitLabel="更新する"
          onSubmit={(l) => { upsertLoan(l); setLoan(l); setEditing(false); }}
          onDelete={() => {
            if (confirm(`「${loan.name}」を削除しますか？`)) {
              deleteLoan(loan.id);
              router.push("/loans");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loan.currentBalance === 0 && loan.principal > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h2 className="text-xl font-bold text-emerald-800">完済おめでとうございます！</h2>
          <p className="mt-2 text-sm text-emerald-700">
            累計返済額 {fmtJPY(totalLoanPaid)}・{loan.payments?.length ?? 0} 回の返済で達成
          </p>
        </section>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-lg" style={{ background: loan.color }} />
          <div>
            <h1 className="text-xl font-bold">{loan.name}</h1>
            <div className="text-sm text-slate-500">{loan.lender || "借入先未設定"}</div>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">編集</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="現在残高" value={fmtJPY(loan.currentBalance)} />
        <Stat
          label={loan.repayType === "revolving" ? "今月の返済（目安）" : "月々返済"}
          value={loan.repayType === "revolving"
            ? `${fmtJPY(currentMonthPayment(loan))}（残高の${loan.revolvingRate ?? 1}%）`
            : fmtJPY(loan.monthlyPayment)}
        />
        <Stat label="完済予定" value={stats.feasible ? (stats.finishDate ?? "—") : "要再計画"} />
        <Stat label="利息総額（予測）" value={fmtJPY(stats.totalInterest)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">返済進捗</h2>
          <span className="text-sm text-slate-500">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: loan.color }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">当初 {fmtJPY(loan.principal)} → 残り {fmtJPY(loan.currentBalance)}</p>
        {reachedMilestones.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reachedMilestones.map((m) => (
              <span key={m} className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700">
                🎯 {m}% 達成
              </span>
            ))}
          </div>
        )}
      </section>

      {!stats.feasible && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          月次返済額が利息を下回っているため、このままでは完済できません。返済額を増やすか、金利の見直しが必要です。
        </div>
      )}

      {!isPaidThisMonth(loan) && isPaymentDuePast(loan) && loan.currentBalance > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          今月の返済記録がまだです（返済日：毎月{loan.paymentDay}日）。返済したら下の「記録する」から入力してください。
        </div>
      )}

      <PaymentRecorder loan={loan} onChange={setLoan} />
      <RateChanges loan={loan} onChange={setLoan} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">元金・利息の内訳（最初の5年）</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v) => fmtJPY(v as number)} />
              <Legend />
              <Bar dataKey="元金" stackId="a" fill={loan.color} />
              <Bar dataKey="利息" stackId="a" fill="#cbd5e1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">返済スケジュール</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 pr-4">回</th>
                <th className="py-2 pr-4">年月</th>
                <th className="py-2 pr-4 text-right">返済</th>
                <th className="py-2 pr-4 text-right">元金</th>
                <th className="py-2 pr-4 text-right">利息</th>
                <th className="py-2 text-right">残高</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(0, showAllSchedule ? 24 : 12).map((r) => (
                <tr key={r.month} className="border-t border-slate-100 tabular-nums">
                  <td className="py-1.5 pr-4">{r.month}</td>
                  <td className="py-1.5 pr-4">{r.date}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtJPY(r.payment)}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtJPY(r.principal)}</td>
                  <td className="py-1.5 pr-4 text-right text-slate-500">{fmtJPY(r.interest)}</td>
                  <td className="py-1.5 text-right font-medium">{fmtJPY(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {schedule.length > 12 && (
          <button
            onClick={() => setShowAllSchedule((v) => !v)}
            className="mt-3 text-sm text-indigo-600 hover:underline"
          >
            {showAllSchedule ? "折りたたむ" : `もっと見る（全${Math.min(schedule.length, 24)}回）`}
          </button>
        )}
      </section>

      {loan.note && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold">メモ</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{loan.note}</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
