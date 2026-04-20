export const metadata = { title: "利用規約 — HENSAI" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-6">
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="mt-1 text-xs text-slate-400">最終更新日：2026年4月21日</p>
      </div>

      <p className="text-sm text-slate-600">
        本規約は、Stellars Lab（以下「当方」）が提供する「HENSAI」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくことで、本規約に同意したものとみなします。
      </p>

      <Section title="1. サービスの概要">
        <p>
          本サービスは、借入の管理・返済計画の立案を支援するウェブアプリケーションです。
          入力されたデータはお使いの端末のブラウザにのみ保存され、当方のサーバーには送信されません。
        </p>
      </Section>

      <Section title="2. 利用条件">
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>本サービスは個人利用を目的としています</li>
          <li>不正アクセス・リバースエンジニアリング等の行為は禁止します</li>
          <li>本サービスを利用した結果については、利用者自身の責任のもとで判断してください</li>
        </ul>
      </Section>

      <Section title="3. 免責事項">
        <p>
          当方は、以下について一切の責任を負いません。
        </p>
        <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600">
          <li>ブラウザのデータ削除・端末の故障等によるデータの紛失</li>
          <li>本サービスの計算結果にもとづく財務上の損失</li>
          <li>本サービスの停止・変更・終了による損害</li>
          <li>第三者によるデータへの不正アクセス（端末紛失等）</li>
        </ul>
        <p className="mt-3">
          本サービスが提供する返済シミュレーションや完済予定は参考値です。実際の返済条件は金融機関との契約内容が優先されます。
        </p>
      </Section>

      <Section title="4. データの取り扱い">
        <p>
          データの取り扱いについては、<a href="/privacy" className="text-indigo-600 hover:underline">プライバシーポリシー</a>をご確認ください。
          定期的なCSVエクスポートによるバックアップをおすすめします。
        </p>
      </Section>

      <Section title="5. サービスの変更・終了">
        <p>
          当方は事前の予告なく本サービスの内容を変更・停止・終了することがあります。
          その場合も当方は一切の責任を負いません。
        </p>
      </Section>

      <Section title="6. 規約の変更">
        <p>
          本規約は予告なく変更される場合があります。重要な変更の場合はサービス内でお知らせします。
          変更後に本サービスを継続してご利用いただいた場合、変更後の規約に同意したものとみなします。
        </p>
      </Section>

      <Section title="お問い合わせ">
        <p>
          本規約に関するお問い合わせは{" "}
          <a href="mailto:stellarsbit@gmail.com" className="text-indigo-600 hover:underline">
            stellarsbit@gmail.com
          </a>{" "}
          までご連絡ください。
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold text-slate-800">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}
