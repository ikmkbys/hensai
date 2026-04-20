import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "HENSAI — 前向きにクリア",
  description: "借入の一元管理・返済計画アプリ。ローカル保存のみ、アカウント不要。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
          HENSAI — データはブラウザ内（localStorage）のみに保存されます
        </footer>
      </body>
    </html>
  );
}
