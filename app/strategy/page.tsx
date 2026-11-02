"use client";
import { useEffect, useMemo, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { fmtJPY, rateAt } from "@/lib/calc";
import { STRATEGY_LABEL, StrategyKey, StrategyResult, priorityOrder, simulateStrategy } from "@/lib/strategy";

const KEYS: StrategyKey[] = ["baseline", "avalanche", "snowball"];

export default function StrategyPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [extra, setExtra] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLoans(loadData().loans);
    setMounted(true);
  }, []);

  const active = useMemo(() => loans.filter((l) => l.currentBalance > 0), [loans]);

  const results = useMemo(() => {
    const out = {} as Record<StrategyKey, StrategyResult>;
    for (const k of KEYS) out[k] = simulateStrategy(active, extra, k);
    return out;
  }, [active, extra]);

  if (!mounted) return null;

  if (active.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">返済の優先順位</h1>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          残高のある借入が2件以上になると、どれから返すと得かを比べられます。
        </div>
      </div>
    );
  }

  const base = results.baseline;
  // 完済できる方法のうち総利息が最も少ないもの
  const best = KEYS.filter((k) => k !== "baseline" && results[k].feasible)
    .sort((a, b) => results[a].totalInterest - results[b].totalInterest)[0];
  const avaOrder = priorityOrder(active, "avalanche");
  const snowOrder = priorityOrder(active, "snowball");
  const sameOrder = avaOrder.map((l) => l.id).join() === snowOrder.map((l) => l.id).join();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">返済の優先順位</h1>
      <p className="text-sm leading-7 text-slate-600">
        借入が複数あるとき、追加で返せるお金を「どの借入から」充てるかで、払う利息の総額が変わります。
        完済した借入の毎月の返済額は、次の月から次の借入へ回していく前提で試算します。
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block max-w-xs">
          <span className="mb-1 block text-sm font-medium">毎月の追加返済額（円）</span>
          <input type="number" min={0} className={input} value={extra || ""} placeholder="0" onChange={(e) => setExtra(Math.max(0, Number(e.target.value)))} />
        </label>
        <p className="mt-2 text-xs text-slate-500">いまの毎月の返済に上乗せできる金額。0円のままでも、完済した借入の分を回す効果は見られます。</p>
      </section>

      {best && results[best].feasible && base.feasible && (
        <section className="rounded-2xl bg-emerald-600 p-5 text-white">
          <div className="text-xs opacity-80">いちばん利息が少ない方法</div>
          <div className="mt-1 text-lg font-bold">{STRATEGY_LABEL[best]}</div>
          <div className="mt-1 text-sm">
            今のままより利息を <span className="font-bold tabular-nums">{fmtJPY(base.totalInterest - results[best].totalInterest)}</span> 減らせて、
            完済が <span className="font-bold tabular-nums">{base.months - results[best].months}ヶ月</span> 早まります。
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">方法</th>
              <th className="px-4 py-3 text-right font-medium">すべて完済</th>
              <th className="px-4 py-3 text-right font-medium">利息の総額</th>
              <th className="px-4 py-3 text-right font-medium">今のままとの差</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => {
              const r = results[k];
              const diff = r.feasible && base.feasible ? base.totalInterest - r.totalInterest : 0;
              return (
                <tr key={k} className={`border-t border-slate-100 ${k === best ? "bg-emerald-50/60" : ""}`}>
                  <td className="px-4 py-3 font-medium">{STRATEGY_LABEL[k]}{k === best && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">おすすめ</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.feasible ? `${r.finishDate ?? "—"}（${r.months}ヶ月）` : "要再計画"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.feasible ? fmtJPY(r.totalInterest) : "∞"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{k !== "baseline" && diff > 0 ? `${fmtJPY(diff)} 減` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <OrderCard title={STRATEGY_LABEL.avalanche} loans={avaOrder} today={today} note="利息の発生が大きい借入から減らす順番。多くの場合、総利息がいちばん少なくなります。" />
        <OrderCard title={STRATEGY_LABEL.snowball} loans={snowOrder} today={today} note="早く1件ずつ片付けて、返済の負担と気持ちを軽くしていく順番。" />
      </section>
      {sameOrder && <p className="text-xs text-slate-500">いまは2つの順番が同じなので、結果の差は出ません。</p>}

      {best && results[best].payoffs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">「{STRATEGY_LABEL[best]}」の完済の流れ</h2>
          <ol className="space-y-2 text-sm">
            {results[best].payoffs.map((p, i) => (
              <li key={p.loanId} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="tabular-nums text-slate-500">{p.date}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="rounded-xl border-l-2 border-indigo-300 bg-indigo-50/60 px-4 py-3 text-xs leading-6 text-slate-600">
        試算は各借入の登録内容にもとづく概算です。繰上返済には手数料や条件（最低額・申込期限など）がある契約もあるため、実際の可否と金額は契約先でご確認ください。
        個別の借入判断についての助言ではありません。
      </p>
    </div>
  );
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function OrderCard({ title, loans, today, note }: { title: string; loans: Loan[]; today: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
      <ol className="mt-3 space-y-2 text-sm">
        {loans.map((l, i) => (
          <li key={l.id} className="flex items-center gap-3">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
            <span className="h-4 w-1.5 flex-shrink-0 rounded-full" style={{ background: l.color }} />
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            <span className="text-xs text-slate-500 tabular-nums">年利{rateAt(l, today)}%・{fmtJPY(l.currentBalance)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
