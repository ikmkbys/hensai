import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HENSAI — 前向きにクリア";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 15% 0%, rgba(230,180,80,0.30) 0%, rgba(230,180,80,0) 55%), #15181d",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* ロゴ的なアクセント */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 32,
            fontSize: 40,
          }}
        >
          💳
        </div>

        {/* タイトル */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          HENSAI
        </div>

        {/* サブタイトル */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            marginBottom: 40,
            letterSpacing: "0.5px",
          }}
        >
          借入の一元管理・返済計画アプリ
        </div>

        {/* バッジ */}
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          {["ローカル保存のみ", "アカウント不要", "完全無料"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.9)",
                fontSize: 20,
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            color: "rgba(255,255,255,0.45)",
            fontSize: 18,
          }}
        >
          stellars-lab.com
        </div>
      </div>
    ),
    { ...size }
  );
}
