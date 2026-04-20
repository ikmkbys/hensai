"use client";
import { useState } from "react";
import { Loan } from "@/lib/types";
import { upsertLoan } from "@/lib/storage";
import { fmtJPY } from "@/lib/calc";

export default function BalanceAdjust({ loan, onChange }: { loan: Loan; onChange: (l: Loan) => void }) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(loan.currentBalance);
  const [note, setNote] = useState("");

  function save() {
    if (balance < 0) return;
    const updated: Loan = { ...loan, currentBalance: balance, updatedAt: new Date().toISOString() };
    upsertLoan(updated);
    onChange(updated);
    setOpen(false);
    setNote("");
  }

  const diff = balance - loan.currentBalance;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">残高の修正</h2>
          <p className="mt-0.5 text-xs text-slate-500">残高証明書と計算値がズレたときに使用</p>
        </div>
        <button
          onClick={() => { setOpen((v) => !v); setBalance(loan.currentBalance); }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          {open ? "キャンセル" : "残高を修正する"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">正しい残高（円）</span>
            <input
              type="number"
              min={0}
              className={input}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
            />
            {balance !== loan.currentBalance && (
              <span className={`mt-1 block text-xs ${diff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                現在 {fmtJPY(loan.currentBalance)} → {diff > 0 ? `+${fmtJPY(diff)}（増加）` : `${fmtJPY(diff)}（減少）`}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">メモ（任意）</span>
            <input type="text" className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：2026年4月残高証明書に合わせて修正" />
          </label>
          <button onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            修正を確定する
          </button>
        </div>
      )}
    </section>
  );
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
