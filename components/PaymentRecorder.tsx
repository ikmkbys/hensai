"use client";
import { useState } from "react";
import { Loan, Payment } from "@/lib/types";
import { fmtJPY, splitPayment } from "@/lib/calc";
import { newId, upsertLoan } from "@/lib/storage";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function PaymentRecorder({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState<number>(loan.monthlyPayment);
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function record() {
    if (amount <= 0) return;
    const { interestPart, principalPart } = splitPayment(loan, date, amount); // 利息先払い・残りを元金から減額
    const p: Payment = { id: newId(), date, amount, note, interestPart, principalPart };
    const updated: Loan = {
      ...loan,
      payments: [...(loan.payments ?? []), p],
      currentBalance: Math.max(0, loan.currentBalance - principalPart),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
    setOpen(false);
    setAmount(loan.monthlyPayment);
    setNote("");
    setDate(today);
  }

  function remove(id: string) {
    const target = loan.payments.find((p) => p.id === id);
    if (!target) return;
    // 旧データ（principalPart未保存）は amount 全額を元金として扱っていたため、そのぶん戻す
    const restorePrincipal = target.principalPart ?? target.amount;
    const updated: Loan = {
      ...loan,
      payments: loan.payments.filter((p) => p.id !== id),
      currentBalance: loan.currentBalance + restorePrincipal,
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
  }

  const history = [...(loan.payments ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const confirmTarget = confirmId ? (loan.payments ?? []).find((p) => p.id === confirmId) : undefined;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <ConfirmDialog
        open={!!confirmTarget}
        title="返済記録を取り消しますか？"
        message={confirmTarget ? `${confirmTarget.date} の ${fmtJPY(confirmTarget.amount)} を取り消します。減算した残高は元に戻ります。` : ""}
        confirmLabel="取り消す"
        onConfirm={() => { if (confirmTarget) remove(confirmTarget.id); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">返済履歴</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85"
        >
          {open ? "キャンセル" : "今月の返済を記録"}
        </button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-control bg-surface-raised p-4 sm:grid-cols-3">
          <label className="block text-meta">
            <span className="mb-1 block font-medium">日付</span>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">金額（円）</span>
            <input type="number" min={0} className={input} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">メモ</span>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="繰上げ等" />
          </label>
          <div className="sm:col-span-3">
            <button onClick={record} className="rounded-control bg-accent px-4 py-2.5 text-meta font-medium text-accent-on hover:bg-accent/85">
              記録する（残高 −{fmtJPY(amount)}）
            </button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-meta text-muted">まだ記録がありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-meta">
            <thead>
              <tr className="text-left text-meta text-muted">
                <th className="py-2 pr-4">日付</th>
                <th className="py-2 pr-4 text-right">金額</th>
                <th className="py-2 pr-4 text-right">元金</th>
                <th className="py-2 pr-4 text-right">利息</th>
                <th className="py-2 pr-4">メモ</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-t border-border tabular-nums">
                  <td className="py-1.5 pr-4">{p.date}</td>
                  <td className="py-1.5 pr-4 text-right font-medium">{fmtJPY(p.amount)}</td>
                  <td className="py-1.5 pr-4 text-right">{p.principalPart != null ? fmtJPY(p.principalPart) : "—"}</td>
                  <td className="py-1.5 pr-4 text-right text-muted">{p.interestPart != null ? fmtJPY(p.interestPart) : "—"}</td>
                  <td className="py-1.5 pr-4 text-muted">{p.note}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => setConfirmId(p.id)} className="text-meta text-danger hover:underline">取消</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
