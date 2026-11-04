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
    const trimmed = note.trim();
    const stamp = new Date().toISOString().slice(0, 10);
    const adjLine = trimmed ? `[${stamp} 残高修正 ${fmtJPY(loan.currentBalance)}→${fmtJPY(balance)}] ${trimmed}` : "";
    const updated: Loan = {
      ...loan,
      currentBalance: balance,
      note: adjLine ? (loan.note ? `${loan.note}\n${adjLine}` : adjLine) : loan.note, // メモ入力時は借入メモ欄に履歴として追記
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    onChange(updated);
    setOpen(false);
    setNote("");
  }

  const diff = balance - loan.currentBalance;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">残高の修正</h2>
          <p className="mt-0.5 text-meta text-muted">残高証明書と計算値がズレたときに使用</p>
        </div>
        <button
          onClick={() => { setOpen((v) => !v); setBalance(loan.currentBalance); }}
          className="rounded-control border border-border-strong bg-surface px-4 py-2 text-meta hover:bg-surface-hover"
        >
          {open ? "キャンセル" : "残高を修正する"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-3 rounded-control bg-surface-raised p-4">
          <label className="block text-meta">
            <span className="mb-1 block font-medium">正しい残高（円）</span>
            <input
              type="number"
              min={0}
              className={input}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
            />
            {balance !== loan.currentBalance && (
              <span className={`mt-1 block text-meta ${diff > 0 ? "text-danger" : "text-positive"}`}>
                現在 {fmtJPY(loan.currentBalance)} → {diff > 0 ? `+${fmtJPY(diff)}（増加）` : `${fmtJPY(diff)}（減少）`}
              </span>
            )}
          </label>
          <label className="block text-meta">
            <span className="mb-1 block font-medium">メモ（任意）</span>
            <input type="text" className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：2026年4月残高証明書に合わせて修正" />
            <span className="mt-1 block text-meta text-muted">入力すると借入のメモ欄に履歴として追記されます</span>
          </label>
          <button onClick={save} className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85">
            修正を確定する
          </button>
        </div>
      )}
    </section>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
