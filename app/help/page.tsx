import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-16">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-6 text-center">
        <div className="mb-3 text-4xl">📚</div>
        <h1 className="text-2xl font-bold">HENSAI の使い方</h1>
        <p className="mt-2 text-slate-600">借入を登録して、返済を記録するだけ。完済への道を一緒に歩もう。</p>
      </div>

      {/* Quick Start */}
      <Section title="はじめかた（3ステップ）">
        <div className="grid gap-4 sm:grid-cols-3">
          <Step n={1} title="借入を登録" desc="借入名・残高・年利・月々の返済額を入力します。" />
          <Step n={2} title="返済を記録" desc="毎月の返済日に「今月の返済を記録」で金額を入力します。" />
          <Step n={3} title="進捗を確認" desc="ホーム画面で残高・完済予定・返済率がひと目でわかります。" />
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/loans/new"
            className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            最初の借入を登録する →
          </Link>
        </div>
      </Section>

      {/* 借入登録 */}
      <Section title="📝 借入登録">
        <div className="space-y-3">
          <FieldRow label="当初借入額" desc="最初に借りた金額。住宅ローンなら契約時の借入額を入力します。進捗（返済率）の計算に使われます。" />
          <FieldRow label="現在残高" desc="いま実際に残っている借入金額。残高証明書や銀行アプリで確認できます。当初借入額より大きい値は入力できません。" />
          <FieldRow label="年利（%）" desc="借入の年間利息率。例：1.2% の場合は「1.2」と入力。" />
          <FieldRow label="月次返済額" desc="毎月いくら返済するか。「自動計算」ボタンで、期間（ヶ月）から元利均等返済額を計算できます。" />
          <FieldRow label="返済日" desc="毎月何日に返済するか（1〜31）。この日を過ぎると「記録忘れ」の通知が出ます。" />
          <FieldRow label="識別色" desc="複数の借入を色分けして管理できます。新規登録時は未使用の色が自動で選ばれます。" />
        </div>
        <Callout>
          💡 <b>月次返済額の自動計算</b>：「月次返済額」の下にある入力欄に返済期間（ヶ月数）を入れて「自動計算」を押すと、元利均等返済の月額が自動で入ります。例：35年 → 420ヶ月。
        </Callout>
      </Section>

      {/* 返済記録 */}
      <Section title="💳 返済記録">
        <p className="text-sm text-slate-700">
          借入詳細ページの「今月の返済を記録」から、日付・金額・メモを入力して記録します。
        </p>
        <div className="mt-3 space-y-2">
          <Item title="元金・利息が自動で分かれる">
            入力した返済額は、その月の金利をもとに「利息分」と「元金分」に自動で分解されます。残高から引かれるのは元金分だけ（利息は費用として記録）。
          </Item>
          <Item title="取消もできる">
            入力ミスや重複記録は「取消」で元に戻せます。取消すると元金分が残高に加算されます。
          </Item>
          <Item title="多め払いも対応">
            毎月の返済額と異なる金額でも記録できます。ボーナス払いや繰り上げ返済の一部として活用できます。
          </Item>
        </div>
      </Section>

      {/* 金利変更 */}
      <Section title="📊 金利変更">
        <p className="text-sm text-slate-700">
          変動金利のローンは、金利が変わったタイミングで「金利変更を追加」から登録します。
          適用開始日以降のスケジュール計算に新しい金利が使われます。
        </p>
        <Callout>
          💡 金利が下がった場合、登録すると月々の利息削減額がお知らせされます。
        </Callout>
      </Section>

      {/* シミュレーター */}
      <Section title="🔮 シミュレーター">
        <p className="text-sm text-slate-700">
          「もし毎月の返済を増やしたら？」「一括で繰り上げ返済したら？」の効果を試算できます。
        </p>
        <div className="mt-3 space-y-2">
          <Item title="月次追加返済">毎月いくら上乗せして返済するかをシミュレート。短縮できる期間と、節約できる利息が表示されます。</Item>
          <Item title="一括繰り上げ返済">まとまった金額を一度に返済した場合の効果を試算します。</Item>
          <Item title="グラフで比較">現状と比較した残高推移グラフで、効果を視覚的に確認できます。</Item>
        </div>
      </Section>

      {/* ホーム画面の見方 */}
      <Section title="🏠 ホーム画面の見方">
        <div className="space-y-2">
          <Item title="総残高">全借入の現在残高合計。</Item>
          <Item title="月次返済合計">全借入の月々返済額の合計。毎月これだけ用意する必要があります。</Item>
          <Item title="完済予定">最も遅く終わる借入の完済月。全借入が終わる目標日です。</Item>
          <Item title="全体の進捗バー">「返済済み ÷ 当初合計」で計算。25/50/75% に達するとバッジが表示されます。</Item>
          <Item title="累計返済額">これまでに記録した返済金額の合計（元金＋利息）。</Item>
          <Item title="連続返済 🔥">連続して返済を記録している月数。途切れるとリセットされます。</Item>
        </div>
      </Section>

      {/* データ管理 */}
      <Section title="💾 データのバックアップ">
        <p className="text-sm text-slate-700">
          HENSAIのデータはサーバーに送信されず、<strong>このブラウザにのみ保存</strong>されています。プライバシーに配慮した設計ですが、ブラウザの設定変更や端末の切り替えによってデータが失われることがあります。
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 text-sm">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">操作</th>
                <th className="px-3 py-2 text-center font-medium">データ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["キャッシュをクリア", "消えない ✅"],
                ["Cookieをクリア", "消えない ✅"],
                ["サイトデータ / ローカルストレージを削除", "消える ❌"],
                ["シークレットモードを閉じる", "消える ❌"],
                ["別ブラウザ・別端末で開く", "表示されない ❌"],
              ].map(([op, result]) => (
                <tr key={op}>
                  <td className="px-3 py-2 text-slate-700">{op}</td>
                  <td className="px-3 py-2 text-center">{result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2">
          <Item title="CSV エクスポート">「設定」→「CSVエクスポート」で全データ（借入情報・返済履歴・金利変更履歴）をまとめてファイルに保存できます。月に1回程度のバックアップをおすすめします。</Item>
          <Item title="CSV インポート">ブラウザ変更・端末変更時は、エクスポートしたCSVを「設定」→「CSVインポート」で読み込むとデータを完全に復元できます。</Item>
        </div>
        <Callout type="warn">
          ⚠️ データの紛失については責任を負いかねます。大切なデータを守るため、定期的なCSVエクスポートをお願いします。
        </Callout>
      </Section>

      {/* FAQ */}
      <Section title="❓ よくある質問">
        <div className="space-y-4">
          <Faq q="登録できる借入の件数に上限はありますか？">
            上限はありません。住宅ローン・車のローン・カードローンなど、複数まとめて管理できます。
          </Faq>
          <Faq q="毎月の返済額と実際の引落額が違います">
            利息の計算方法や端数処理によって数百円のズレが生じることがあります。実際に引き落とされた金額をそのまま記録するのがおすすめです。
          </Faq>
          <Faq q="完済予定の日付はどう計算されますか？">
            元利均等返済方式（毎月一定額を返済）で計算しています。金利変更がある場合はその月から新しい金利で再計算します。
          </Faq>
          <Faq q="残高が「0」になったらどうなりますか？">
            完済おめでとうセクションが表示されます 🎉 記録はそのまま残ります。
          </Faq>
          <Faq q="スマホでも使えますか？">
            ブラウザから <strong>hensai.stellars-lab.com</strong> にアクセスするとスマホでも利用できます。ホーム画面に追加すると、アプリのように使えます。
          </Faq>
        </div>
      </Section>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-indigo-600 font-bold text-white">
        {n}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function FieldRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-white p-3">
      <span className="mt-0.5 min-w-24 text-xs font-semibold text-indigo-700">{label}</span>
      <span className="text-sm text-slate-600">{desc}</span>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <p className="mt-0.5 text-sm text-slate-600">{children}</p>
    </div>
  );
}

function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warn" }) {
  const styles = type === "warn"
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-indigo-100 bg-indigo-50 text-indigo-800";
  return (
    <div className={`mt-3 rounded-xl border p-4 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-800">Q. {q}</div>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  );
}
