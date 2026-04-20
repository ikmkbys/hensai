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
        <footer className="mx-auto max-w-5xl border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="https://stellars-lab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Stellars Lab
            </a>
            <a href="/privacy" className="hover:text-slate-600 transition-colors">プライバシーポリシー</a>
            <a href="/terms" className="hover:text-slate-600 transition-colors">利用規約</a>
            <a href="/help" className="hover:text-slate-600 transition-colors">ヘルプ</a>
          </div>
          <p className="mt-3">© {new Date().getFullYear()} Stellars Lab. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
