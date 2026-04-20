"use client";
import { AppData, Loan } from "./types";

const KEY = "hensai.v1";

const empty: AppData = {
  version: 1,
  loans: [],
  settings: { currency: "JPY", theme: "light" },
};

export function loadData(): AppData {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as AppData;
    const loans = (parsed.loans ?? []).map((l) => ({
      ...l,
      payments: l.payments ?? [],
      rateChanges: l.rateChanges ?? [],
    }));
    return { ...empty, ...parsed, loans };
  } catch {
    return empty;
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function upsertLoan(loan: Loan) {
  const data = loadData();
  const i = data.loans.findIndex((l) => l.id === loan.id);
  if (i >= 0) data.loans[i] = loan;
  else data.loans.push(loan);
  saveData(data);
}

export function deleteLoan(id: string) {
  const data = loadData();
  data.loans = data.loans.filter((l) => l.id !== id);
  saveData(data);
}

export function getLoan(id: string): Loan | undefined {
  return loadData().loans.find((l) => l.id === id);
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
