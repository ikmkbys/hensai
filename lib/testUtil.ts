import { Loan } from "./types";

// テスト用のLoanを作る。指定しない項目は元利均等・年利1.2%・毎月27日払いの既定値
export function makeLoan(over: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    name: "テスト借入",
    lender: "テスト銀行",
    principal: 100000,
    currentBalance: 100000,
    annualRate: 1.2,
    monthlyPayment: 10000,
    startDate: "2026-04-01",
    paymentDay: 27,
    color: "#6366f1",
    note: "",
    payments: [],
    rateChanges: [],
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...over,
  };
}
