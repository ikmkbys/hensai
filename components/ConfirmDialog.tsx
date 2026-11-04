"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, message, confirmLabel = "削除する", onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div className="w-full max-w-md rounded-card bg-surface p-6 elevate-4">
        <h2 className="mb-2 text-title font-bold">{title}</h2>
        <p className="mb-5 whitespace-pre-wrap text-meta text-muted">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-control border border-danger/50 bg-surface px-4 py-2 text-meta font-medium text-danger hover:bg-danger/10"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-control border border-border bg-surface px-4 py-2 text-meta text-muted hover:bg-surface-hover"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
