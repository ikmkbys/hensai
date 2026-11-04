"use client";
import { useState } from "react";
import { Charge, Loan } from "@/lib/types";
import { newId, upsertLoan } from "@/lib/storage";
import { fmtJPY } from "@/lib/calc";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ChargeRecorder({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function add() {
    if (amount <= 0) return;
    const charge: Charge = { id: newId(), date, amount, note };
    const updated: Loan = {
      ...loan,
      currentBalance: loan.currentBalance + amount,
      charges: [...(loan.charges ?? []), charge].sort((a, b) => a.date.localeCompare(b.date)),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
    setOpen(false);
    setAmount(0);
    setNote("");
  }

  function remove(id: string) {
    const charge = (loan.charges ?? []).find((c) => c.id === id);
    if (!charge) return;
    const updated: Loan = {
      ...loan,
      currentBalance: Math.max(0, loan.currentBalance - charge.amount),
      charges: (loan.charges ?? []).filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
  }

  const list = [...(loan.charges ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const confirmTarget = confirmId ? (loan.charges ?? []).find((c) => c.id === confirmId) : undefined;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <ConfirmDialog
        open={!!confirmTarget}
        title="利用記録を削除しますか？"
        message={confirmTarget ? `${confirmTarget.date} の +${fmtJPY(confirmTarget.amount)} を削除します。加算した残高は元に戻ります。` : ""}
        onConfirm={() => { if (confirmTarget) remove(confirmTarget.id); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">利用額の追加</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-control border border-border-strong bg-surface px-4 py-2 text-meta hover:bg-surface-hover"
        >
          {open ? "キャンセル" : "+ 利用を追加"}
        </button>
      </div>
      <p className="mb-3 text-meta text-muted">カードの利用分を追加すると残高に加算されます。</p>

      {open && (
        <div className="mb-4 grid gap-3 rounded-control bg-surface-raised p-4 sm:grid-cols-3">
          <label className="block text-meta">
            <span className="mb-1 block font-medium">利用日</span>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">利用額（円）</span>
            <input type="number" min={1} className={input} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
            {amount > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(amount)}</span>}
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">メモ</span>
            <input type="text" className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：家電購入" />
          </label>
          <div className="sm:col-span-3">
            <button onClick={add} className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85">
              追加する
            </button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-meta text-muted">利用記録はまだありません。</p>
      ) : (
        <table className="w-full text-meta">
          <thead>
            <tr className="text-left text-meta text-muted">
              <th className="py-2 pr-4">日付</th>
              <th className="py-2 pr-4 text-right">利用額</th>
              <th className="py-2 pr-4">メモ</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border tabular-nums">
                <td className="py-1.5 pr-4">{c.date}</td>
                <td className="py-1.5 pr-4 text-right text-danger">+{fmtJPY(c.amount)}</td>
                <td className="py-1.5 pr-4 text-muted">{c.note}</td>
                <td className="py-1.5 text-right">
                  <button onClick={() => setConfirmId(c.id)} className="text-meta text-danger hover:underline">削除</button>
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
