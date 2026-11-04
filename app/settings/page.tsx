"use client";
import { useEffect, useRef, useState } from "react";
import { loadData, saveData } from "@/lib/storage";
import { downloadCSV, fromCSV, toCSV } from "@/lib/csv";
import { getLastBackup, markBackup } from "@/lib/backup";
import { Loan } from "@/lib/types";
import { Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLoans(loadData().loans); setLastBackup(getLastBackup()); }, []);

  function handleExport() {
    const csv = toCSV(loans);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`hensai_${stamp}.csv`, csv);
    markBackup();
    setLastBackup(getLastBackup());
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
      <h1 className="text-title font-bold">設定</h1>

      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
          <div className="w-full max-w-md rounded-card bg-surface p-6 elevate-4">
            <div className="mb-1"><Trash2 className="h-6 w-6 text-danger" /></div>
            <h2 className="mb-2 text-title font-bold">全データを削除しますか？</h2>
            <p className="mb-4 text-meta text-muted">
              借入情報・返済履歴・金利変更履歴を含む<strong>すべてのデータが完全に削除</strong>されます。この操作は取り消せません。
            </p>
            <div className="mb-5 rounded-control border border-accent/30 bg-accent-dim px-4 py-3 text-meta text-accent">
              <AlertTriangle className="inline h-4 w-4 mr-1 align-text-bottom" />削除前にCSVエクスポートでバックアップを取っておくことをおすすめします。
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportThenClose}
                className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85"
              >
                CSVを出力してからキャンセル
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-control border border-danger/50 bg-surface px-4 py-2 text-meta font-medium text-danger hover:bg-danger/10"
                >
                  削除する
                </button>
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="flex-1 rounded-control border border-border bg-surface px-4 py-2 text-meta text-muted hover:bg-surface-hover"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg && <div className="rounded-control border border-positive/30 bg-positive-dim px-4 py-2 text-meta text-positive">{msg}</div>}

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="mb-2 font-semibold">データ管理</h2>
        <p className="mb-4 text-meta text-muted">
          このアプリのデータはブラウザ内（localStorage）にのみ保存されます。端末変更時はCSVでバックアップ・復元できます。
        </p>
        <p className="mb-4 text-meta text-muted">
          最後のバックアップ：{lastBackup ? new Date(lastBackup).toLocaleDateString("ja-JP") : "まだありません"}
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="rounded-control bg-accent px-4 py-2 text-meta font-medium text-accent-on hover:bg-accent/85">
            CSVエクスポート
          </button>
          <label className="cursor-pointer rounded-control border border-border-strong bg-surface px-4 py-2 text-meta font-medium hover:bg-surface-hover">
            CSVインポート
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => setShowResetDialog(true)} className="rounded-control border border-danger/50 bg-surface px-4 py-2 text-meta font-medium text-danger hover:bg-danger/10">
            全データ削除
          </button>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 text-meta text-muted">
        <h2 className="mb-2 font-semibold text-foreground">HENSAIについて</h2>
        <p>
          複数の借入を一元管理し、「前向きにクリア」するための返済計画アプリです。<br />
          アカウント登録不要。すべてのデータはあなたの端末内にのみ保存されます。
        </p>
      </section>
    </div>
  );
}
