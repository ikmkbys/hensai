"use client";
import { useEffect, useMemo, useState } from "react";
import { loadData } from "@/lib/storage";
import { Loan } from "@/lib/types";
import { fmtJPY, rateAt } from "@/lib/calc";
import { StrategyKey, StrategyResult, priorityOrder, simulateStrategy } from "@/lib/strategy";

const KEYS: StrategyKey[] = ["baseline", "avalanche", "snowball"];

/* この画面での呼び名。毎月の返済は全部払う前提なので「返す順」ではなく「上乗せ先」で言う */
const LABEL: Record<StrategyKey, string> = {
  baseline: "上乗せしない（今のまま）",
  avalanche: "金利の高い借入に上乗せ",
  snowball: "残高の少ない借入に上乗せ",
};

export default function StrategyPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [extra, setExtra] = useState<number>(0);
  const [rollover, setRollover] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLoans(loadData().loans);
    setMounted(true);
  }, []);

  const active = useMemo(() => loans.filter((l) => l.currentBalance > 0), [loans]);

  const results = useMemo(() => {
    const out = {} as Record<StrategyKey, StrategyResult>;
    for (const k of KEYS) out[k] = simulateStrategy(active, extra, k, rollover);
    return out;
  }, [active, extra, rollover]);

  if (!mounted) return null;

  if (active.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-title font-bold">上乗せ返済の優先順位</h1>
        <div className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
          残高のある借入が2件以上になると、余らせたお金をどの借入に上乗せすると得かを比べられます。
        </div>
      </div>
    );
  }

  const base = results.baseline;
  // 完済できる方法のうち総利息が最も少ないもの
  const best = KEYS.filter((k) => k !== "baseline" && results[k].feasible)
    .sort((a, b) => results[a].totalInterest - results[b].totalInterest)[0];
  const gain = best && results[best].feasible && base.feasible ? base.totalInterest - results[best].totalInterest : 0; // 上乗せしない場合との利息の差
  const avaOrder = priorityOrder(active, "avalanche");
  const snowOrder = priorityOrder(active, "snowball");
  const sameOrder = avaOrder.map((l) => l.id).join() === snowOrder.map((l) => l.id).join();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-title font-bold">上乗せ返済の優先順位</h1>
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-meta font-bold">このページの前提</h2>
        <ul className="mt-2 space-y-1 text-meta leading-7 text-muted">
          <li>・毎月の返済は、<span className="text-foreground">どの借入も決まった額を全部払う</span>前提です。ここで選ぶものではありません。</li>
          <li>・比べるのは、毎月の返済とは別に<span className="text-foreground">余らせて回せるお金を、どの借入に上乗せするか</span>だけです。</li>
          <li>・完済した借入の返済額を次の借入へ回し続けるかどうかは、下のチェックで選べます。</li>
        </ul>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <label className="block max-w-xs">
          <span className="mb-1 block text-meta font-medium">毎月の上乗せ額（円）</span>
          <input type="number" min={0} className={input} value={extra || ""} placeholder="0" onChange={(e) => setExtra(Math.max(0, Number(e.target.value)))} />
        </label>
        <p className="mt-2 text-meta text-muted">毎月の決まった返済とは別に、余らせて回せる金額。</p>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-accent" />
          <span className="text-meta">
            <span className="font-medium">完済した借入の返済額も、次の借入へ回す</span>
            <span className="mt-1 block text-muted">
              {rollover
                ? "オン：借入を1件完済したら、その月々の返済額を払い続けて次の借入へ充てる前提です。上乗せ額が0円でも差が出るのは、このためです。"
                : "オフ：完済した借入の返済はそこで終わり、その分は回しません。上乗せ額が0円なら、どの方法も今のままと同じ結果になります。"}
            </span>
          </span>
        </label>
      </section>

      {best && results[best].feasible && base.feasible && gain > 0 && (
        <section className="rounded-card border border-positive/30 bg-positive-dim p-5 text-foreground">
          <div className="text-meta text-positive">いちばん利息が少ない上乗せ先</div>
          <div className="mt-1 text-title font-bold">{LABEL[best]}</div>
          <div className="mt-1 text-meta">
            上乗せしない場合より利息を <span className="font-bold tabular-nums">{fmtJPY(base.totalInterest - results[best].totalInterest)}</span> 減らせて、
            完済が <span className="font-bold tabular-nums">{base.months - results[best].months}ヶ月</span> 早まります。
          </div>
        </section>
      )}

      {best && results[best].feasible && base.feasible && gain <= 0 && (
        <p className="rounded-control border border-border bg-surface px-4 py-3 text-meta text-muted">
          いまの設定では、どの上乗せ先でも結果は同じです。上乗せ額を入れるか、「完済した借入の返済額も次へ回す」をオンにすると、差が出ます。
        </p>
      )}

      <section className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[34rem] text-meta">
          <thead className="bg-surface-raised text-left text-meta text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">上乗せの回し先</th>
              <th className="px-4 py-3 text-right font-medium">すべて完済</th>
              <th className="px-4 py-3 text-right font-medium">利息の総額</th>
              <th className="px-4 py-3 text-right font-medium">上乗せしない場合との差</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => {
              const r = results[k];
              const diff = r.feasible && base.feasible ? base.totalInterest - r.totalInterest : 0;
              return (
                <tr key={k} className={`border-t border-border ${k === best && gain > 0 ? "bg-positive-dim" : ""}`}>
                  <td className="px-4 py-3 font-medium">{LABEL[k]}{k === best && gain > 0 && <span className="ml-2 rounded-pill bg-positive-dim px-2 py-0.5 text-meta text-positive">おすすめ</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.feasible ? `${r.finishDate ?? "—"}（${r.months}ヶ月）` : "要再計画"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.feasible ? fmtJPY(r.totalInterest) : "∞"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-positive">{k !== "baseline" && diff > 0 ? `${fmtJPY(diff)} 減` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <OrderCard title={LABEL.avalanche} loans={avaOrder} today={today} note="金利の高い借入から先に上乗せしていく順番。利息の発生が大きいところから減らすので、多くの場合、総利息がいちばん少なくなります。" />
        <OrderCard title={LABEL.snowball} loans={snowOrder} today={today} note="残高の少ない借入から先に上乗せしていく順番。早く1件ずつ片付けて、返済の負担と気持ちを軽くします。" />
      </section>
      {sameOrder && <p className="text-meta text-muted">いまは2つの順番が同じなので、結果の差は出ません。</p>}

      {best && results[best].payoffs.length > 0 && (
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">「{LABEL[best]}」の場合の完済の流れ</h2>
          <ol className="space-y-2 text-meta">
            {results[best].payoffs.map((p, i) => (
              <li key={p.loanId} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-pill bg-accent-dim text-meta font-bold text-accent">{i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="tabular-nums text-muted">{p.date}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="rounded-control border-l-2 border-accent/30 bg-accent-dim px-4 py-3 text-meta leading-6 text-muted">
        試算は各借入の登録内容にもとづく概算です。繰上返済には手数料や条件（最低額・申込期限など）がある契約もあるため、実際の可否と金額は契約先でご確認ください。
        個別の借入判断についての助言ではありません。
      </p>
    </div>
  );
}

const input = "w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

function OrderCard({ title, loans, today, note }: { title: string; loans: Loan[]; today: string; note: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-meta text-muted">{note}</p>
      <ol className="mt-3 space-y-2 text-meta">
        {loans.map((l, i) => (
          <li key={l.id} className="flex items-center gap-3">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-pill bg-surface-raised text-meta font-bold text-muted">{i + 1}</span>
            <span className="h-4 w-1.5 flex-shrink-0 rounded-pill" style={{ background: l.color }} />
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            <span className="text-meta text-muted tabular-nums">年利{rateAt(l, today)}%・{fmtJPY(l.currentBalance)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
