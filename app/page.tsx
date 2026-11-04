"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadData, newId, upsertLoan } from "@/lib/storage";
import { Loan, Payment } from "@/lib/types";
import { buildSchedule, calcConsecutiveMonths, calcStats, calcTotalPaid, currentMonthPayment, fmtJPY, isPaidThisMonth, isPaymentDuePast, progressPct, splitPayment } from "@/lib/calc";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { axisTick, chartGrid, legendProps, tooltipStyle } from "@/lib/chartTheme";
import BackupNoticeModal from "@/components/BackupNoticeModal";
import BackupReminder from "@/components/BackupReminder";
import { Target, Flame, HardDrive } from "lucide-react";

export default function HomePage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [mounted, setMounted] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState(0);

  useEffect(() => {
    setLoans(loadData().loans);
    setMounted(true);
  }, []);

  function quickRecord(loan: Loan) {
    if (payAmount <= 0) return;
    const { interestPart, principalPart } = splitPayment(loan, payDate, payAmount);
    const p: Payment = { id: newId(), date: payDate, amount: payAmount, note: "", interestPart, principalPart };
    const updated: Loan = {
      ...loan,
      payments: [...(loan.payments ?? []), p],
      currentBalance: Math.max(0, loan.currentBalance - principalPart),
      updatedAt: new Date().toISOString(),
    };
    upsertLoan(updated);
    setLoans((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    setPayingId(null);
  }

  const totalBalance = loans.reduce((s, l) => s + l.currentBalance, 0);
  const totalMonthly = loans.reduce((s, l) => s + currentMonthPayment(l), 0);
  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const paid = Math.max(0, totalPrincipal - totalBalance);
  const pct = totalPrincipal > 0 ? (paid / totalPrincipal) * 100 : 0;
  const totalPaid = calcTotalPaid(loans);
  const consecutiveMonths = calcConsecutiveMonths(loans);

  const finishDate = useMemo(() => {
    let latest: string | null = null;
    for (const l of loans) {
      const s = calcStats(l);
      if (!s.feasible) return "再計画が必要";
      if (s.finishDate && (!latest || s.finishDate > latest)) latest = s.finishDate;
    }
    return latest ?? "—";
  }, [loans]);

  const pieData = loans.map((l) => ({ name: l.name, value: l.currentBalance, color: l.color }));

  const trendData = useMemo(() => {
    if (loans.length === 0) return [];
    const perLoan = loans.map((l) => buildSchedule(l));
    const maxLen = Math.max(...perLoan.map((s) => s.length));
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      let total = 0;
      let date = "";
      loans.forEach((l, idx) => {
        const r = perLoan[idx][i];
        if (r) { total += r.balance; date = r.date; }
      });
      rows.push({ date, 残高: total });
    }
    return rows;
  }, [loans]);

  if (!mounted) return null;

  if (loans.length === 0) {
    return (
      <>
        <BackupNoticeModal />
        <div className="grid place-items-center py-16 text-center">
        <div className="max-w-md">
          <div className="mb-6 flex justify-center"><Target className="h-14 w-14 text-accent" /></div>
          <h1 className="mb-3 text-section font-bold">前向きに、クリアしていこう</h1>
          <p className="mb-8 text-muted">
            借入を登録すると、残高・返済予定・完済日が一目でわかります。<br />
            データはこの端末にしか保存されません。
          </p>
          <Link
            href="/loans/new"
            className="inline-block rounded-control bg-accent px-6 py-3 font-medium text-accent-on elevate-1 transition hover:bg-accent/85"
          >
            最初の借入を登録する
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-2xl space-y-8 border-t border-border pt-10 text-muted">
        <div>
          <h2 className="mb-3 text-title font-bold text-foreground">HENSAI にできること</h2>
          <p className="text-meta leading-7">
            奉学金、自動車ローン、カードのリボ払い。
            それぞれの残高は明細を見れば分かるのに、合計でいつ終わるのかだけが分からない。
            HENSAI は複数の借入をまとめて登録し、完済までの道筋を一本の線として見せるための道具です。
            元利均等・元金均等・リボ払い（定率）の三方式に対応していて、
            毎月いくら上乗せすると完済が何ヶ月縮むのかもその場で試せます。
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-title font-bold text-foreground">返済方式で、総額は変わる</h2>
          <dl className="space-y-4 text-meta leading-7">
            <div>
              <dt className="font-semibold text-foreground">元利均等返済</dt>
              <dd>
                毎月払う額（元金＋利息）が一定になる方式。家計に組み込みやすい反面、
                返済の初期は払った額の大半が利息に消え、元金がなかなか減りません。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">元金均等返済</dt>
              <dd>
                毎月減らす元金を一定にする方式。借りた直後の負担が重いかわりに、
                同じ条件なら総利息は元利均等より少なくなります。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">リボ払い</dt>
              <dd>
                毎月の支払額を先に決める方式。負担感は出にくいのですが、
                手数料の割合が大きいと元金の減りが極端に遅くなります。
                利息の目安は「残高 × 年利 ÷ 12」。残高 50 万円・年率 15% ならひと月あたり約 6,250 円で、
                月 1 万円払っても元金は 3,750 円ずつしか減りません。
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="mb-3 text-title font-bold text-foreground">繰り上げ返済は「型」で効果が変わる</h2>
          <p className="text-meta leading-7">
            期間短縮型は毎月の返済額を変えずに期間を縮める方法で、利息の削減効果が大きくなります。
            返済額軽減型は毎月の負担を下げる方法で、削減効果は小さいかわりに手元の現金が楽になります。
            複数の借入がある場合は、金額の大きいものではなく
            <strong className="font-semibold text-foreground">金利の高いものから先に潰す</strong>
            のが原則です。減らすべきなのは残高ではなく、これから発生する利息のほうだからです。
          </p>
        </div>

        <div className="rounded-control border-l-2 border-accent/30 bg-accent-dim px-4 py-3 text-meta leading-6">
          HENSAI は返済計画を試算するための道具です。金融商品の勧誘や、
          個別の借入判断についての助言を行うものではありません。
          実際の契約条件・返済額・手数料は、必ず契約先の明細でご確認ください。
        </div>

        <p className="text-meta text-muted">
          このアプリの詳しい説明は
          <a href="https://stellars-lab.com/hensai" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-accent">Stellars Lab の紹介ページ</a>
          にあります。使い方は<Link href="/help" className="underline underline-offset-4 hover:text-accent">ヘルプ</Link>をどうぞ。
        </p>
      </section>
      </>
    );
  }

  const unpaid = loans.filter((l) => l.currentBalance > 0 && !isPaidThisMonth(l) && isPaymentDuePast(l));

  return (
    <div className="space-y-6">
      <BackupNoticeModal />
      {unpaid.length > 0 && (
        <div className="flex items-center justify-between rounded-control border border-accent/30 bg-accent-dim p-4 text-meta text-accent">
          <span>今月の返済記録を忘れずに（{unpaid.length} 件）</span>
          <Link href={`/loans/${unpaid[0].id}`} className="font-medium underline">記録する →</Link>
        </div>
      )}
      <BackupReminder loans={loans} />
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="総残高" value={fmtJPY(totalBalance)} hero />
        <Stat label="月次返済合計" value={fmtJPY(totalMonthly)} />
        <Stat label="完済予定" value={finishDate} />
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">全体の進捗</h2>
          <span className="text-meta text-muted">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-raised">
          <div
            className="h-full rounded-pill bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-meta text-muted">
          返済済み {fmtJPY(paid)} / 当初合計 {fmtJPY(totalPrincipal)}
        </p>
        <div className="mt-3 flex gap-6 border-t border-border pt-3">
          <div>
            <div className="text-meta text-muted">累計返済額</div>
            <div className="mt-0.5 font-semibold tabular-nums">{fmtJPY(totalPaid)}</div>
          </div>
          {consecutiveMonths > 0 && (
            <div>
              <div className="text-meta text-muted">連続返済</div>
              <div className="mt-0.5 font-semibold tabular-nums flex items-center gap-1">{consecutiveMonths}ヶ月継続中 <Flame className="h-4 w-4 text-accent" /></div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">残高内訳</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color || "var(--accent)"} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtJPY(v as number)} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">残高推移（予測）</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="date" tick={axisTick} minTickGap={40} />
                <YAxis tick={axisTick} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                <Tooltip formatter={(v) => fmtJPY(v as number)} {...tooltipStyle} />
                <Legend {...legendProps} />
                <Line type="monotone" dataKey="残高" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">借入一覧</h2>
          <Link href="/loans/new" className="text-meta text-accent hover:underline">+ 新規追加</Link>
        </div>
        <div className="space-y-2">
          {loans.map((l) => {
            const isOpen = payingId === l.id;
            return (
              <div key={l.id} className="overflow-hidden rounded-control border border-border">
                <div className="flex items-center gap-3 p-3 transition hover:bg-accent-dim/40">
                  <Link href={`/loans/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-8 w-2 flex-shrink-0 rounded-pill" style={{ background: l.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.name}</div>
                      <div className="text-meta text-muted">{l.lender}・年利 {l.annualRate}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{fmtJPY(l.currentBalance)}</div>
                      <div className="text-meta text-muted">{progressPct(l).toFixed(0)}% 完了</div>
                    </div>
                  </Link>
                  {l.currentBalance > 0 && (
                    <div className="ml-1 flex items-center gap-1.5">
                      {isPaidThisMonth(l) && (
                        <span className="rounded-pill bg-positive-dim px-2 py-0.5 text-meta font-medium text-positive">済</span>
                      )}
                      <button
                        onClick={() => {
                          if (isOpen) { setPayingId(null); return; }
                          setPayingId(l.id);
                          setPayAmount(currentMonthPayment(l));
                          setPayDate(new Date().toISOString().slice(0, 10));
                        }}
                        className={`rounded-control px-3 py-1.5 text-meta font-medium transition ${isOpen ? "bg-surface-raised text-muted hover:bg-surface-raised-hover" : "bg-accent text-accent-on hover:bg-accent/85"}`}
                      >
                        {isOpen ? "×" : "記録"}
                      </button>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-border bg-surface-raised px-3 py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="block text-meta">
                        <span className="mb-1 block font-medium text-muted">日付</span>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={miniInput} />
                      </label>
                      <label className="block text-meta">
                        <span className="mb-1 block font-medium text-muted">金額（円）</span>
                        <input type="number" min={0} value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} className={miniInput} />
                      </label>
                      <button onClick={() => quickRecord(l)} className="rounded-control bg-accent px-3 py-2.5 text-meta font-medium text-accent-on hover:bg-accent/85">
                        記録する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <div className="rounded-control border border-border bg-surface px-5 py-4 text-center">
        <p className="text-meta font-medium text-foreground">
          <HardDrive className="inline h-4 w-4 mr-1 align-text-bottom text-muted" />データはこの端末のブラウザにのみ保存されます。
        </p>
        <p className="mt-1 text-meta text-muted">
          端末・ブラウザを変えるとデータは引き継がれません。{" "}
          <Link href="/settings" className="text-accent underline hover:text-accent">定期的なCSVバックアップ</Link>をおすすめします。
        </p>
      </div>
    </div>
  );
}

const miniInput = "rounded-control border border-border bg-surface px-2 py-1.5 text-meta outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

function Stat({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  /* 主役の数字は画面にひとつだけ（総残高）。残りは落ち着いた面に置く */
  return (
    <div className={`rounded-card border bg-surface p-5 elevate-1 ${hero ? "border-accent/40" : "border-border"}`}>
      <div className="text-meta text-muted">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${hero ? "text-figure text-accent" : "text-section text-foreground"}`}>{value}</div>
    </div>
  );
}
