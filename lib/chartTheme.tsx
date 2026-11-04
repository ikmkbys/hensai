/* recharts の配色。色の値はここに書かず、テーマのトークン（CSS変数）を指す */
export const chartGrid = "var(--border)";
export const axisTick = { fontSize: 12, fill: "var(--muted)" };
export const tooltipStyle = {
  contentStyle: {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-strong)",
    borderRadius: 12,
    color: "var(--foreground)",
    fontSize: 14,
  },
  labelStyle: { color: "var(--muted)" },
  itemStyle: { color: "var(--foreground)" },
};
export const legendProps = {
  wrapperStyle: { fontSize: 14, color: "var(--muted)" },
  formatter: (v: string) => <span style={{ color: "var(--muted)" }}>{v}</span>,
};
