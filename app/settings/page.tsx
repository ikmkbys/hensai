"use client";
import { useEffect, useRef, useState } from "react";
import { loadData, saveData } from "@/lib/storage";
import { downloadCSV, fromCSV, toCSV } from "@/lib/csv";
import { Loan } from "@/lib/types";

export default function SettingsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [msg, setMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLoans(loadData().loans); }, []);

  function handleExport() {
    const csv = toCSV(loans);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`hensai_${stamp}.csv`, csv);
    setMsg(`${loans.length}件をエクスポートしました`);
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
    if (!confirm("すべてのデータを削除します。よろしいですか？")) return;
    saveData({ version: 1, loans: [], settings: { currency: "JPY", theme: "light" } });
    setLoans([]);
    setMsg("すべてのデータを削除しました");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">設定</h1>

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
          <button onClick={handleReset} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
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
