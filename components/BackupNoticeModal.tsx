"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const SHOWN_KEY = "hensai.backup-notice-v1";

const CASES = [
  ["キャッシュをクリア", "消えない ✅"],
  ["Cookieをクリア", "消えない ✅"],
  ["サイトデータ / ローカルストレージを削除", "消える ❌"],
  ["シークレットモードを閉じる", "消える ❌"],
  ["別ブラウザ・別端末で開く", "表示されない ❌"],
] as const;

export default function BackupNoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SHOWN_KEY)) setOpen(true);
  }, []);

  function close() {
    localStorage.setItem(SHOWN_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 text-2xl">💾</div>
        <h2 className="mb-2 text-lg font-bold">データの保管について</h2>
        <p className="mb-4 text-sm text-slate-600">
          HENSAIのデータはサーバーに送信されず、<strong>このブラウザにのみ保存</strong>されます。
          プライバシーに配慮した設計ですが、次のような操作でデータが消えることがあります。
        </p>
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 text-sm">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">操作</th>
                <th className="px-3 py-2 text-center font-medium">データ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CASES.map(([op, result]) => (
                <tr key={op}>
                  <td className="px-3 py-2 text-slate-700">{op}</td>
                  <td className="px-3 py-2 text-center">{result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mb-5 text-sm text-slate-600">
          万が一に備え、定期的に<strong>CSVエクスポート</strong>でバックアップをとっておくと安心です。
        </p>
        <div className="flex gap-3">
          <Link
            href="/settings"
            onClick={close}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            今すぐCSVを出力する
          </Link>
          <button
            onClick={close}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            わかった
          </button>
        </div>
      </div>
    </div>
  );
}
