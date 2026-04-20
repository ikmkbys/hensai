import { Loan, Payment, RateChange } from "./types";

const HEADERS = [
  "id",
  "name",
  "lender",
  "principal",
  "currentBalance",
  "annualRate",
  "monthlyPayment",
  "repayType",
  "revolvingRate",
  "revolvingMin",
  "startDate",
  "paymentDay",
  "color",
  "note",
  "payments",       // JSON
  "rateChanges",    // JSON
  "createdAt",
  "updatedAt",
] as const;

function escape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCSV(loans: Loan[]): string {
  const rows = [HEADERS.join(",")];
  for (const l of loans) {
    const record: Record<string, string> = {
      id: l.id,
      name: l.name,
      lender: l.lender,
      principal: String(l.principal),
      currentBalance: String(l.currentBalance),
      annualRate: String(l.annualRate),
      monthlyPayment: String(l.monthlyPayment),
      repayType: l.repayType ?? "fixed",
      revolvingRate: String(l.revolvingRate ?? ""),
      revolvingMin: String(l.revolvingMin ?? ""),
      startDate: l.startDate,
      paymentDay: String(l.paymentDay),
      color: l.color,
      note: l.note,
      payments: JSON.stringify(l.payments ?? []),
      rateChanges: JSON.stringify(l.rateChanges ?? []),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
    rows.push(HEADERS.map((h) => escape(record[h] ?? "")).join(","));
  }
  return rows.join("\n");
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseJSONArray<T>(v: string): T[] {
  if (!v) return [];
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
}

// CSV行を1つずつ切り出す（クォート内改行を許容）
function splitRows(csv: string): string[] {
  const rows: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { q = !q; cur += c; }
    else if (c === "\n" && !q) { if (cur.length) rows.push(cur); cur = ""; }
    else if (c === "\r" && !q) { continue; }
    else cur += c;
  }
  if (cur.length) rows.push(cur);
  return rows;
}

export function fromCSV(csv: string): Loan[] {
  const lines = splitRows(csv);
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const loans: Loan[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    header.forEach((h, j) => (obj[h] = cols[j] ?? ""));
    loans.push({
      id: obj.id,
      name: obj.name,
      lender: obj.lender,
      principal: Number(obj.principal) || 0,
      currentBalance: Number(obj.currentBalance) || 0,
      annualRate: Number(obj.annualRate) || 0,
      monthlyPayment: Number(obj.monthlyPayment) || 0,
      repayType: (obj.repayType === "revolving" ? "revolving" : "fixed") as "fixed" | "revolving",
      revolvingRate: obj.revolvingRate ? Number(obj.revolvingRate) : undefined,
      revolvingMin: obj.revolvingMin ? Number(obj.revolvingMin) : undefined,
      startDate: obj.startDate,
      paymentDay: Number(obj.paymentDay) || 27,
      color: obj.color || "#6366f1",
      note: obj.note || "",
      payments: parseJSONArray<Payment>(obj.payments),
      rateChanges: parseJSONArray<RateChange>(obj.rateChanges),
      createdAt: obj.createdAt || new Date().toISOString(),
      updatedAt: obj.updatedAt || new Date().toISOString(),
    });
  }
  return loans;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
