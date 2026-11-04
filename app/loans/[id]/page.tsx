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
import { axisTick, chartGrid, legendProps, tooltipStyle } from "@/lib/chartTheme";
import { PartyPopper, Trophy } from "lucide-react";
import PaymentRecorder from "@/components/PaymentRecorder";
import RateChanges from "@/components/RateChanges";
import BalanceAdjust from "@/components/BalanceAdjust";
import ChargeRecorder from "@/components/ChargeRecorder";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLoan(getLoan(params.id) ?? null);
  }, [params.id]);

  if (loan === undefined) return null;
  if (loan === null) return <div className="text-muted">見つかりませんでした。</div>;

  const stats = calcStats(loan);
  const schedule = buildSchedule(loan);
  const chartData = schedule.slice(0, 60).map((r) => ({ date: r.date, 元金: r.principal, 利息: r.interest }));
  const pct = progressPct(loan);
  const reachedMilestones = [25, 50, 75].filter((m) => pct >= m);
  const totalLoanPaid = (loan.payments ?? []).reduce((s, p) => s + p.amount, 0);

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-title font-bold">借入を編集</h1>
          <button onClick={() => setEditing(false)} className="text-meta text-muted hover:underline">キャンセル</button>
        </div>
        <LoanForm
          initial={loan}
          submitLabel="更新する"
          onSubmit={(l) => { upsertLoan(l); setLoan(l); setEditing(false); }}
          onDelete={() => setConfirmDelete(true)}
        />
        <ConfirmDialog
          open={confirmDelete}
          title={`「${loan.name}」を削除しますか？`}
          message="この借入の返済履歴・金利変更履歴もすべて削除されます。この操作は取り消せません。"
          onConfirm={() => { deleteLoan(loan.id); router.push("/loans"); }}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loan.currentBalance === 0 && loan.principal > 0 && (
        <section className="rounded-card border border-positive/30 bg-positive-dim p-6 text-center">
          <div className="mb-2 flex justify-center"><PartyPopper className="h-10 w-10 text-positive" /></div>
          <h2 className="text-title font-bold text-positive">完済おめでとうございます！</h2>
          <p className="mt-2 text-meta text-positive">
            累計返済額 {fmtJPY(totalLoanPaid)}・{loan.payments?.length ?? 0} 回の返済で達成
          </p>
        </section>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-control" style={{ background: loan.color }} />
          <div>
            <h1 className="text-title font-bold">{loan.name}</h1>
            <div className="text-meta text-muted">{loan.lender || "借入先未設定"}</div>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-control border border-border-strong bg-surface px-4 py-2 text-meta hover:bg-surface-hover">編集</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="現在残高" value={fmtJPY(loan.currentBalance)} />
        <Stat
          label={loan.repayType === "revolving" ? "今月の返済（目安）" : "月々返済"}
          value={loan.repayType === "revolving"
            ? `${fmtJPY(currentMonthPayment(loan))}（残高の${loan.revolvingRate ?? 1}%）`
            : fmtJPY(loan.monthlyPayment)}
        />
        <Stat label={loan.repayType === "revolving" ? "完済予定（参考）" : "完済予定"} value={stats.feasible ? (stats.finishDate ?? "—") : "要再計画"} />
        <Stat label="利息総額（予測）" value={fmtJPY(stats.totalInterest)} />
      </section>
      {loan.repayType === "revolving" && (
        <p className="text-meta text-muted">
          ※ 完済予定・利息総額・スケジュールは「残高の{loan.revolvingRate ?? 1}%・最低{(loan.revolvingMin ?? 5000).toLocaleString()}円」で試算した参考値です。実際の支払い額はカード会社の規定によって異なります。
        </p>
      )}

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">返済進捗</h2>
          <span className="text-meta text-muted">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill bg-surface-raised">
          <div className="h-full rounded-pill" style={{ width: `${pct}%`, background: loan.color }} />
        </div>
        <p className="mt-2 text-meta text-muted">当初 {fmtJPY(loan.principal)} → 残り {fmtJPY(loan.currentBalance)}</p>
        {reachedMilestones.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reachedMilestones.map((m) => (
              <span key={m} className="rounded-pill bg-accent-dim px-3 py-0.5 text-meta font-medium text-accent">
                <Trophy className="inline h-3 w-3 mr-1 align-text-bottom" />{m}% 達成
              </span>
            ))}
          </div>
        )}
      </section>

      {!stats.feasible && (
        <div className="rounded-control border border-accent/30 bg-accent-dim p-4 text-meta text-accent">
          {loan.repayType === "revolving"
            ? "毎月の支払いが利息をまかなえないため、このままでは残高が減りません。支払い率・最低支払額の見直しが必要です。"
            : "月次返済額が利息を下回っているため、このままでは完済できません。返済額を増やすか、金利の見直しが必要です。"}
        </div>
      )}

      {!isPaidThisMonth(loan) && isPaymentDuePast(loan) && loan.currentBalance > 0 && (
        <div className="rounded-control border border-accent/30 bg-accent-dim p-4 text-meta text-accent">
          今月の返済記録がまだです（返済日：毎月{loan.paymentDay}日）。返済したら下の「記録する」から入力してください。
        </div>
      )}

      <PaymentRecorder loan={loan} onChange={setLoan} />
      {loan.repayType === "revolving" && <ChargeRecorder loan={loan} onChange={setLoan} />}
      <RateChanges loan={loan} onChange={setLoan} />
      <BalanceAdjust loan={loan} onChange={setLoan} />

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">元金・利息の内訳（最初の5年）</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="date" tick={axisTick} minTickGap={30} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v) => fmtJPY(v as number)} {...tooltipStyle} />
              <Legend {...legendProps} />
              <Bar dataKey="元金" stackId="a" fill={loan.color} />
              <Bar dataKey="利息" stackId="a" fill="var(--muted-weak)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">返済スケジュール</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-meta">
            <thead>
              <tr className="text-left text-meta text-muted">
                <th className="py-2 pr-4">回</th>
                <th className="py-2 pr-4">年月</th>
                <th className="py-2 pr-4 text-right">返済</th>
                <th className="py-2 pr-4 text-right">元金</th>
                <th className="py-2 pr-4 text-right">利息</th>
                <th className="py-2 text-right">残高</th>
              </tr>
            </thead>
            <tbody>
              {(showAllSchedule ? schedule : schedule.slice(0, 12)).map((r) => (
                <tr key={r.month} className="border-t border-border tabular-nums">
                  <td className="py-1.5 pr-4">{r.month}</td>
                  <td className="py-1.5 pr-4">{r.date}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtJPY(r.payment)}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtJPY(r.principal)}</td>
                  <td className="py-1.5 pr-4 text-right text-muted">{fmtJPY(r.interest)}</td>
                  <td className="py-1.5 text-right font-medium">{fmtJPY(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {schedule.length > 12 && (
          <button
            onClick={() => setShowAllSchedule((v) => !v)}
            className="mt-3 text-meta text-accent hover:underline"
          >
            {showAllSchedule ? "折りたたむ" : `すべて表示（全${schedule.length}回）`}
          </button>
        )}
      </section>

      {loan.note && (
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="mb-2 font-semibold">メモ</h2>
          <p className="whitespace-pre-wrap text-meta text-foreground">{loan.note}</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-meta text-muted">{label}</div>
      <div className="mt-1 text-title font-bold tabular-nums">{value}</div>
    </div>
  );
}
