"use client";
import { useState } from "react";
import { Loan } from "@/lib/types";
import { newId } from "@/lib/storage";
import { fmtJPY } from "@/lib/calc";

const COLORS = ["#e6b450", "#5fc39a", "#79b4e0", "#b39ae8", "#f08a7e", "#4fc3d0", "#e58bb4", "#a9c95a"];

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
    repayType: initial?.repayType ?? "fixed",
    principalPerMonth: initial?.principalPerMonth ?? 0,
    bonusPayment: initial?.bonusPayment ?? 0,
    bonusMonths: initial?.bonusMonths ?? [],
    revolvingRate: initial?.revolvingRate ?? 1,
    revolvingMin: initial?.revolvingMin ?? 5000,
    charges: initial?.charges ?? [],
    gracePeriodMonths: initial?.gracePeriodMonths ?? 0,
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
    <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-border bg-surface p-5">
      <Row label="借入名" required>
        <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="例：住宅ローン" />
      </Row>
      <Row label="借入先">
        <input className={input} value={form.lender} onChange={(e) => set("lender", e.target.value)} placeholder="例：〇〇銀行" />
      </Row>
      <Row label="返済方式">
        <div className="flex flex-wrap gap-2">
          {([
            ["fixed", "定額（元利均等）"],
            ["principal_equal", "元金均等"],
            ["revolving", "リボ払い（定率）"],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => set("repayType", t)}
              className={`rounded-control border px-4 py-2 text-meta transition ${
                form.repayType === t
                  ? "border-accent/30 bg-accent-dim font-medium text-accent"
                  : "border-border bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {form.repayType === "fixed" && (
          <p className="mt-1.5 text-meta text-muted">毎月同じ金額を返済。元金と利息の内訳は変わりますが、支払額は完済まで一定です。</p>
        )}
        {form.repayType === "principal_equal" && (
          <p className="mt-1.5 text-meta text-muted">毎月同額の元金を返済。利息は残高に応じて変動するため、月々の支払いは徐々に減ります。</p>
        )}
        {form.repayType === "revolving" && (
          <p className="mt-1.5 text-meta text-muted">残高に対して一定の率で返済。残高が減ると支払額も減りますが、利息が多く元金が減りにくい点に注意。</p>
        )}
      </Row>
      {form.repayType !== "revolving" && (
        <Row label="据置期間（ヶ月）">
          <input type="number" min={0} className={input} value={form.gracePeriodMonths || ""} onChange={(e) => set("gracePeriodMonths", Number(e.target.value))} placeholder="0 = なし" />
          {(form.gracePeriodMonths ?? 0) > 0 && (
            <span className="mt-1 block text-meta text-muted">開始から {form.gracePeriodMonths} ヶ月間は利息のみ支払い、元金は変わりません。</span>
          )}
        </Row>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="当初借入額（円）" required>
          <input type="number" min={0} className={input} value={form.principal || ""} onChange={(e) => set("principal", Number(e.target.value))} required />
          {form.principal > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.principal)}</span>}
        </Row>
        <Row label="現在残高（円）" required>
          <input type="number" min={0} className={`${input} ${balanceError ? "border-danger/50" : ""}`} value={form.currentBalance || ""} onChange={(e) => set("currentBalance", Number(e.target.value))} required />
          {form.currentBalance > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.currentBalance)}</span>}
          {balanceError && <span className="mt-1 block text-meta text-danger">現在残高は当初借入額以下にしてください</span>}
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
            <span className="mt-1 block text-meta text-positive">無利子（知人への借入など）</span>
          )}
        </Row>
        {form.repayType === "revolving" ? (
          <>
            <Row label="毎月支払い率（%）" required>
              <input type="number" step="0.1" min={0.1} className={input} value={form.revolvingRate || ""} onChange={(e) => set("revolvingRate", Number(e.target.value))} required placeholder="例：1.0" />
              <span className="mt-1 block text-meta text-muted">残高 × この率 = 月の支払い額</span>
            </Row>
            <Row label="最低支払額（円）">
              <input type="number" min={0} className={input} value={form.revolvingMin || ""} onChange={(e) => set("revolvingMin", Number(e.target.value))} placeholder="例：5000" />
              {form.revolvingMin != null && form.revolvingMin > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.revolvingMin)}</span>}
            </Row>
          </>
        ) : form.repayType === "principal_equal" ? (
          <Row label="毎月の元金返済額（円）" required>
            <input type="number" min={0} className={input} value={form.principalPerMonth || ""} onChange={(e) => set("principalPerMonth", Number(e.target.value))} required placeholder="例：50000" />
            {(form.principalPerMonth ?? 0) > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.principalPerMonth!)} ＋ 利息（変動）</span>}
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={1} placeholder="期間（ヶ月）" className={`${input} w-32`} value={termMonths || ""} onChange={(e) => setTermMonths(Number(e.target.value))} />
              <button type="button" onClick={() => {
                const balance = form.currentBalance > 0 ? form.currentBalance : form.principal;
                if (balance > 0 && termMonths > 0) set("principalPerMonth", Math.ceil(balance / termMonths));
              }} className="whitespace-nowrap rounded-control border border-border-strong bg-surface px-3 py-2 text-meta hover:bg-surface-hover">
                自動計算
              </button>
            </div>
          </Row>
        ) : (
          <Row label="月次返済額（円）" required>
            <input type="number" min={0} className={input} value={form.monthlyPayment || ""} onChange={(e) => set("monthlyPayment", Number(e.target.value))} required />
            {form.monthlyPayment > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.monthlyPayment)}</span>}
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={1} placeholder="期間（ヶ月）" className={`${input} w-32`} value={termMonths || ""} onChange={(e) => setTermMonths(Number(e.target.value))} />
              <button type="button" onClick={calcMonthlyPayment} className="whitespace-nowrap rounded-control border border-border-strong bg-surface px-3 py-2 text-meta hover:bg-surface-hover">
                自動計算
              </button>
            </div>
          </Row>
        )}
        <Row label="開始日">
          <input type="date" className={input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Row>
        <Row label="毎月の返済日">
          <input type="number" min={1} max={31} className={input} value={form.paymentDay} onChange={(e) => set("paymentDay", Number(e.target.value))} />
        </Row>
      </div>
      {form.repayType !== "revolving" && (
        <div className="rounded-control border border-border bg-surface-raised p-4">
          <label className="flex cursor-pointer items-center gap-2 text-meta font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-accent"
              checked={(form.bonusMonths?.length ?? 0) > 0}
              onChange={(e) => set("bonusMonths", e.target.checked ? [6, 12] : [])}
            />
            ボーナス払いあり
          </label>
          {(form.bonusMonths?.length ?? 0) > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row label="ボーナス追加払い（円）">
                <input type="number" min={0} className={input} value={form.bonusPayment || ""} onChange={(e) => set("bonusPayment", Number(e.target.value))} placeholder="例：100000" />
                {(form.bonusPayment ?? 0) > 0 && <span className="mt-1 block text-meta text-muted">{fmtJPY(form.bonusPayment!)}</span>}
              </Row>
              <Row label="ボーナス月">
                <div className="flex flex-wrap gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => {
                    const checked = (form.bonusMonths ?? []).includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const cur = form.bonusMonths ?? [];
                          set("bonusMonths", checked ? cur.filter((x) => x !== m) : [...cur, m].sort((a, b) => a - b));
                        }}
                        className={`h-8 w-8 rounded-control text-meta font-medium transition ${checked ? "bg-accent text-accent-on" : "border border-border bg-surface text-muted hover:bg-surface-hover"}`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <span className="mt-1 block text-meta text-muted">選択した月に追加払いが発生</span>
              </Row>
            </div>
          )}
        </div>
      )}
      <Row label="識別色">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("color", c)}
              className={`h-8 w-8 rounded-pill ring-offset-2 transition ${form.color === c ? "ring-2 ring-accent" : ""}`}
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
          <button type="button" onClick={onDelete} className="text-meta text-danger hover:underline">削除</button>
        ) : <span />}
        <button type="submit" className="rounded-control bg-accent px-5 py-2.5 font-medium text-accent-on hover:bg-accent/85">{submitLabel}</button>
      </div>
    </form>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-meta font-medium text-foreground">
        {label}{required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
