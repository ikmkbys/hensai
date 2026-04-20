"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ホーム" },
  { href: "/loans", label: "借入一覧" },
  { href: "/simulator", label: "シミュレーター" },
  { href: "/settings", label: "設定" },
  { href: "/help", label: "ヘルプ" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 font-bold text-white">H</span>
          <span className="font-semibold tracking-tight">HENSAI</span>
          <span className="hidden text-xs text-slate-400 sm:inline">前向きにクリア</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {items.map((i) => {
            const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`rounded-md px-3 py-1.5 transition ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
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
