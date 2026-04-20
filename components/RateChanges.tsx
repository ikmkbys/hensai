"use client";
import { useState } from "react";
import { Loan, RateChange } from "@/lib/types";
import { newId, upsertLoan } from "@/lib/storage";
import { fmtJPY, rateAt, sortRateChanges } from "@/lib/calc";

export default function RateChanges({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState<number>(loan.annualRate);
  const [savingsFeedback, setSavingsFeedback] = useState<{ monthly: number; prevRate: number; newRate: number } | null>(null);

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
    if (!confirm("この金利変更を削除しますか？")) return;
    const updated: Loan = {
      ...loan,
      rateChanges: loan.rateChanges.filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
  }

  const list = sortRateChanges(loan.rateChanges ?? []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">金利変更履歴</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          {open ? "キャンセル" : "+ 金利変更を追加"}
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">初期金利：{loan.annualRate}%（{loan.startDate} 〜）</p>

      {open && (
        <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">適用開始日</span>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">新しい年利（%）</span>
            <input type="number" step="0.01" min={0} className={input} value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} />
          </label>
          <div className="sm:col-span-3">
            <button onClick={add} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              追加する
            </button>
          </div>
        </div>
      )}

      {savingsFeedback && (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          🎉 金利が {savingsFeedback.prevRate}% → {savingsFeedback.newRate}% に下がりました！
          月々の利息負担が約 {fmtJPY(savingsFeedback.monthly)} 軽減されます。
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">金利変更はまだ登録されていません。</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2 pr-4">適用開始</th>
              <th className="py-2 pr-4 text-right">年利</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 tabular-nums">
                <td className="py-1.5 pr-4">{r.date}</td>
                <td className="py-1.5 pr-4 text-right font-medium">{r.annualRate}%</td>
                <td className="py-1.5 text-right">
                  <button onClick={() => remove(r.id)} className="text-xs text-red-600 hover:underline">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
