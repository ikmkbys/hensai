"use client";
import { useState } from "react";
import { Loan, RateChange } from "@/lib/types";
import { newId, upsertLoan } from "@/lib/storage";
import { fmtJPY, rateAt, sortRateChanges } from "@/lib/calc";
import { TrendingDown } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function RateChanges({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState<number>(loan.annualRate);
  const [savingsFeedback, setSavingsFeedback] = useState<{ monthly: number; prevRate: number; newRate: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function add() {
    if (!date || rate < 0) return;
    const prevRate = rateAt(loan, date);
    const rc: RateChange = { id: newId(), date, annualRate: rate };
    const updated: Loan = {
      ...loan,
      rateChanges: sortRateChanges([...(loan.rateChanges ?? []), rc]),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
    setOpen(false);
    if (rate < prevRate && loan.currentBalance > 0) {
      const monthly = Math.floor(loan.currentBalance * (prevRate - rate) / 100 / 12);
      setSavingsFeedback({ monthly, prevRate, newRate: rate });
    } else {
      setSavingsFeedback(null);
    }
  }

  function remove(id: string) {
    const updated: Loan = {
      ...loan,
      rateChanges: loan.rateChanges.filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
  }

  const list = sortRateChanges(loan.rateChanges ?? []);
  const confirmTarget = confirmId ? (loan.rateChanges ?? []).find((r) => r.id === confirmId) : undefined;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <ConfirmDialog
        open={!!confirmTarget}
        title="金利変更を削除しますか？"
        message={confirmTarget ? `${confirmTarget.date} 適用の ${confirmTarget.annualRate}% を削除します。以降のスケジュール計算から除外されます。` : ""}
        onConfirm={() => { if (confirmTarget) remove(confirmTarget.id); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">金利変更履歴</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-control border border-border-strong bg-surface px-4 py-2 text-meta hover:bg-surface-hover"
        >
          {open ? "キャンセル" : "+ 金利変更を追加"}
        </button>
      </div>
      <p className="mb-3 text-meta text-muted">初期金利：{loan.annualRate}%（{loan.startDate} 〜）</p>

      {open && (
        <div className="mb-4 grid gap-3 rounded-control bg-surface-raised p-4 sm:grid-cols-3">
          <label className="block text-meta">
            <span className="mb-1 block font-medium">適用開始日</span>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">新しい年利（%）</span>
            <input type="number" step="0.01" min={0} className={input} value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} />
          </label>
          <div className="sm:col-span-3">
            <button onClick={add} className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85">
              追加する
            </button>
          </div>
        </div>
      )}

      {savingsFeedback && (
        <div className="mb-3 rounded-control border border-positive/30 bg-positive-dim p-3 text-meta text-positive">
          <TrendingDown className="inline h-4 w-4 mr-1 align-text-bottom" />金利が {savingsFeedback.prevRate}% → {savingsFeedback.newRate}% に下がりました！
          月々の利息負担が約 {fmtJPY(savingsFeedback.monthly)} 軽減されます。
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-meta text-muted">金利変更はまだ登録されていません。</p>
      ) : (
        <table className="w-full text-meta">
          <thead>
            <tr className="text-left text-meta text-muted">
              <th className="py-2 pr-4">適用開始</th>
              <th className="py-2 pr-4 text-right">年利</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-border tabular-nums">
                <td className="py-1.5 pr-4">{r.date}</td>
                <td className="py-1.5 pr-4 text-right font-medium">{r.annualRate}%</td>
                <td className="py-1.5 text-right">
                  <button onClick={() => setConfirmId(r.id)} className="text-meta text-danger hover:underline">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
