"use client";
import { useState } from "react";
import { Loan } from "@/lib/types";
import { newId } from "@/lib/storage";
import { fmtJPY } from "@/lib/calc";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16"];

type Props = {
  initial?: Partial<Loan>;
  onSubmit: (loan: Loan) => void;
  onDelete?: () => void;
  submitLabel?: string;
  usedColors?: string[];
};

function firstUnusedColor(usedColors?: string[]): string {
  if (!usedColors?.length) return COLORS[0];
  return COLORS.find((c) => !usedColors.includes(c)) ?? COLORS[0];
}

export default function LoanForm({ initial, onSubmit, onDelete, submitLabel = "保存", usedColors }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Loan>({
    id: initial?.id ?? newId(),
    name: initial?.name ?? "",
    lender: initial?.lender ?? "",
    principal: initial?.principal ?? 0,
    currentBalance: initial?.currentBalance ?? 0,
    annualRate: initial?.annualRate ?? 0,
    monthlyPayment: initial?.monthlyPayment ?? 0,
    startDate: initial?.startDate ?? today,
    paymentDay: initial?.paymentDay ?? 27,
    color: initial?.color ?? firstUnusedColor(usedColors),
    note: initial?.note ?? "",
    payments: initial?.payments ?? [],
    rateChanges: initial?.rateChanges ?? [],
    createdAt: initial?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [termMonths, setTermMonths] = useState<number>(0);
  const [rateStr, setRateStr] = useState(String(initial?.annualRate ?? ""));

  function set<K extends keyof Loan>(k: K, v: Loan[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function calcMonthlyPayment() {
    const balance = form.currentBalance > 0 ? form.currentBalance : form.principal;
    if (balance <= 0 || termMonths <= 0) return;
    const r = form.annualRate / 100 / 12;
    const pmt = r === 0 ? balance / termMonths : balance * r / (1 - Math.pow(1 + r, -termMonths));
    set("monthlyPayment", Math.ceil(pmt));
  }

  const balanceError = form.principal > 0 && form.currentBalance > form.principal;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (balanceError) return;
    onSubmit({ ...form, updatedAt: new Date().toISOString() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <Row label="借入名" required>
        <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="例：住宅ローン" />
      </Row>
      <Row label="借入先">
        <input className={input} value={form.lender} onChange={(e) => set("lender", e.target.value)} placeholder="例：〇〇銀行" />
      </Row>
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="当初借入額（円）" required>
          <input type="number" min={0} className={input} value={form.principal || ""} onChange={(e) => set("principal", Number(e.target.value))} required />
          {form.principal > 0 && <span className="mt-1 block text-xs text-slate-400">{fmtJPY(form.principal)}</span>}
        </Row>
        <Row label="現在残高（円）" required>
          <input type="number" min={0} className={`${input} ${balanceError ? "border-red-400" : ""}`} value={form.currentBalance || ""} onChange={(e) => set("currentBalance", Number(e.target.value))} required />
          {form.currentBalance > 0 && <span className="mt-1 block text-xs text-slate-400">{fmtJPY(form.currentBalance)}</span>}
          {balanceError && <span className="mt-1 block text-xs text-red-500">現在残高は当初借入額以下にしてください</span>}
        </Row>
        <Row label="年利（%）">
          <input
            type="number"
            step="0.01"
            min={0}
            className={input}
            value={rateStr}
            onChange={(e) => { setRateStr(e.target.value); set("annualRate", e.target.value === "" ? 0 : Number(e.target.value)); }}
            placeholder="0 = 無利子"
          />
          {rateStr === "0" && (
            <span className="mt-1 block text-xs text-emerald-600">無利子（知人への借入など）</span>
          )}
        </Row>
        <Row label="月次返済額（円）" required>
          <input type="number" min={0} className={input} value={form.monthlyPayment || ""} onChange={(e) => set("monthlyPayment", Number(e.target.value))} required />
          {form.monthlyPayment > 0 && <span className="mt-1 block text-xs text-slate-400">{fmtJPY(form.monthlyPayment)}</span>}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="期間（ヶ月）"
              className={`${input} w-32`}
              value={termMonths || ""}
              onChange={(e) => setTermMonths(Number(e.target.value))}
            />
            <button
              type="button"
              onClick={calcMonthlyPayment}
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50"
            >
              自動計算
            </button>
          </div>
        </Row>
        <Row label="開始日">
          <input type="date" className={input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Row>
        <Row label="毎月の返済日">
          <input type="number" min={1} max={31} className={input} value={form.paymentDay} onChange={(e) => set("paymentDay", Number(e.target.value))} />
        </Row>
      </div>
      <Row label="識別色">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("color", c)}
              className={`h-8 w-8 rounded-full ring-offset-2 transition ${form.color === c ? "ring-2 ring-slate-900" : ""}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Row>
      <Row label="メモ">
        <textarea className={`${input} min-h-20`} value={form.note} onChange={(e) => set("note", e.target.value)} />
      </Row>

      <div className="flex items-center justify-between gap-3 pt-2">
        {onDelete ? (
          <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline">削除</button>
        ) : <span />}
        <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">{submitLabel}</button>
      </div>
    </form>
  );
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
