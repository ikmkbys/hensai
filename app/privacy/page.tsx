export const metadata = { title: "プライバシーポリシー — HENSAI" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-6">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-1 text-xs text-slate-400">最終更新日：2026年4月21日</p>
      </div>

      <p className="text-sm text-slate-600">
        Stellars Lab（以下「当方」）は、「HENSAI」（以下「本サービス」）における個人情報の取り扱いについて、以下の通りポリシーを定めます。
      </p>

      <Section title="1. 収集する情報">
        <p>
          本サービスはアカウント登録を必要とせず、入力されたデータはすべてお使いの端末のブラウザ（localStorage）にのみ保存されます。
          <strong>データは当方のサーバーには一切送信・保存されません。</strong>
        </p>
        <p className="mt-2">
          ただし、ホスティングサービス（Vercel）により、アクセスログ（IPアドレス・閲覧日時・ブラウザ情報など）が自動的に記録される場合があります。これらは本サービスの運営・改善目的にのみ使用されます。
        </p>
      </Section>

      <Section title="2. 利用目的">
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>本サービスの提供・安定運営</li>
          <li>不正アクセス・障害の検知（アクセスログの範囲内）</li>
        </ul>
      </Section>

      <Section title="3. 第三者提供">
        <p>
          当方は収集した情報を、法令に基づく場合を除き第三者に提供しません。
        </p>
        <p className="mt-2">本サービスでは以下の外部サービスを利用しています：</p>
        <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600">
          <li><span className="font-medium text-slate-700">Vercel</span>：ウェブサイトのホスティング。アクセスログが収集される場合があります</li>
        </ul>
      </Section>

      <Section title="4. データの管理">
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>借入情報・返済履歴はすべてお使いのブラウザのみに保存されます</li>
          <li>「設定」画面のCSVエクスポートからデータをバックアップできます</li>
          <li>ブラウザの「サイトデータを削除」操作でデータをいつでも完全削除できます</li>
        </ul>
      </Section>

      <Section title="5. Cookieについて">
        <p>
          本サービスは広告目的のCookieを使用しません。初回アクセス時の案内表示管理のみにlocalStorageを利用しています。
        </p>
      </Section>

      <Section title="6. ポリシーの変更">
        <p>
          本ポリシーは予告なく変更される場合があります。重要な変更の場合はサービス内でお知らせします。
        </p>
      </Section>

      <Section title="お問い合わせ">
        <p>
          本ポリシーに関するお問い合わせは{" "}
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
