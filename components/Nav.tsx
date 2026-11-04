"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ホーム" },
  { href: "/loans", label: "借入一覧" },
  { href: "/simulator", label: "シミュレーター" },
  { href: "/strategy", label: "優先順位" },
  { href: "/settings", label: "設定" },
  { href: "/help", label: "ヘルプ" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 border-b border-border bg-background/85 backdrop-blur" style={{ zIndex: "var(--z-header)" }}>
      <div className="app-width flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          {/* スタンドの灯り：アクセントはここと「いま」の印だけに使う */}
          <span className="h-2 w-2 rounded-pill bg-accent" aria-hidden />
          <span className="tabular-nums text-title font-bold tracking-[0.18em] text-foreground">HENSAI</span>
          <span className="hidden text-meta text-muted sm:inline">返済の見える化ツール</span>
        </Link>
        <nav aria-label="メイン" className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto text-meta">
          {items.map((i) => {
            const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-control px-2 py-1.5 transition-colors sm:px-3 ${
                  active
                    ? "bg-accent-dim font-bold text-accent underline decoration-2 underline-offset-8"
                    : "text-muted hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
