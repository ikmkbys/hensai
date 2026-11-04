import type { Metadata } from "next";
import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { Analytics } from "@vercel/analytics/next";

/* base.css が参照するフォント変数名は固定（--font-sans-jp / --font-num） */
const sansJp = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-num",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HENSAI — 前向きにクリア",
  description: "借入の一元管理・返済計画アプリ。ローカル保存のみ、アカウント不要。",
  openGraph: {
    title: "HENSAI — 前向きにクリア",
    description: "借入の一元管理・返済計画アプリ。ローカル保存のみ、アカウント不要。",
    url: "https://hensai.stellars-lab.com",
    siteName: "HENSAI",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "HENSAI — 前向きにクリア",
    description: "借入の一元管理・返済計画アプリ。ローカル保存のみ、アカウント不要。",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${sansJp.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-screen text-foreground">
        <Nav />
        <main className="app-width px-4 py-6 md:px-6 md:py-10">{children}</main>
        <footer className="app-width border-t border-border px-4 py-8 text-center text-meta text-muted md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="https://stellars-lab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-muted underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Stellars Lab
            </a>
            <a href="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">プライバシーポリシー</a>
            <a href="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">利用規約</a>
            <a href="/help" className="underline underline-offset-4 hover:text-foreground transition-colors">ヘルプ</a>
          </div>
          <p className="mt-3 text-micro">© {new Date().getFullYear()} Stellars Lab. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
