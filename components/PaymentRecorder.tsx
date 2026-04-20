"use client";
import { useState } from "react";
import { Loan, Payment } from "@/lib/types";
import { fmtJPY, splitPayment } from "@/lib/calc";
import { newId, upsertLoan } from "@/lib/storage";

export default function PaymentRecorder({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState<number>(loan.monthlyPayment);
  const [note, setNote] = useState("");

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
    if (!confirm(`${target.date} の ${fmtJPY(target.amount)} を取り消しますか？（残高が戻ります）`)) return;
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">返済履歴</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {open ? "キャンセル" : "今月の返済を記録"}
        </button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">日付</span>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">金額（円）</span>
            <input type="number" min={0} className={input} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">メモ</span>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="繰上げ等" />
          </label>
          <div className="sm:col-span-3">
            <button onClick={record} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              記録する（残高 −{fmtJPY(amount)}）
            </button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-sm text-slate-500">まだ記録がありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
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
                <tr key={p.id} className="border-t border-slate-100 tabular-nums">
                  <td className="py-1.5 pr-4">{p.date}</td>
                  <td className="py-1.5 pr-4 text-right font-medium">{fmtJPY(p.amount)}</td>
                  <td className="py-1.5 pr-4 text-right">{p.principalPart != null ? fmtJPY(p.principalPart) : "—"}</td>
                  <td className="py-1.5 pr-4 text-right text-slate-500">{p.interestPart != null ? fmtJPY(p.interestPart) : "—"}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{p.note}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">取消</button>
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

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
