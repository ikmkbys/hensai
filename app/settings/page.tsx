"use client";
import { useEffect, useRef, useState } from "react";
import { loadData, saveData } from "@/lib/storage";
import { downloadCSV, fromCSV, toCSV } from "@/lib/csv";
import { Loan } from "@/lib/types";

export default function SettingsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLoans(loadData().loans); }, []);

  function handleExport() {
    const csv = toCSV(loans);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`hensai_${stamp}.csv`, csv);
    setMsg(`${loans.length}件をエクスポートしました`);
  }

  function handleExportThenClose() {
    handleExport();
    setShowResetDialog(false);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = fromCSV(String(reader.result));
        const data = loadData();
        const map = new Map(data.loans.map((l) => [l.id, l]));
        imported.forEach((l) => map.set(l.id, l));
        const merged = Array.from(map.values());
        saveData({ ...data, loans: merged });
        setLoans(merged);
        setMsg(`${imported.length}件をインポートしました`);
      } catch {
        setMsg("インポートに失敗しました。CSV形式を確認してください。");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(f);
  }

  function handleReset() {
    saveData({ version: 1, loans: [], settings: { currency: "JPY", theme: "light" } });
    setLoans([]);
    setShowResetDialog(false);
    setMsg("すべてのデータを削除しました");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">設定</h1>

      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 text-2xl">🗑️</div>
            <h2 className="mb-2 text-lg font-bold">全データを削除しますか？</h2>
            <p className="mb-4 text-sm text-slate-600">
              借入情報・返済履歴・金利変更履歴を含む<strong>すべてのデータが完全に削除</strong>されます。この操作は取り消せません。
            </p>
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ 削除前にCSVエクスポートでバックアップを取っておくことをおすすめします。
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportThenClose}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                CSVを出力してからキャンセル
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  削除する
                </button>
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{msg}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold">データ管理</h2>
        <p className="mb-4 text-sm text-slate-600">
          このアプリのデータはブラウザ内（localStorage）にのみ保存されます。端末変更時はCSVでバックアップ・復元できます。
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            CSVエクスポート
          </button>
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            CSVインポート
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => setShowResetDialog(true)} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            全データ削除
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-900">HENSAIについて</h2>
        <p>
          複数の借入を一元管理し、「前向きにクリア」するための返済計画アプリです。<br />
          アカウント登録不要。すべてのデータはあなたの端末内にのみ保存されます。
        </p>
      </section>
    </div>
  );
}
