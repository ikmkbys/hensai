export type Payment = {
  id: string;
  date: string;         // YYYY-MM-DD
  amount: number;       // 実際に支払った額
  note: string;
  interestPart?: number;  // 記録時点で計算した利息分
  principalPart?: number; // 記録時点で計算した元金分（残高から減らした額）
};

export type Charge = {
  id: string;
  date: string;    // YYYY-MM-DD
  amount: number;  // 追加した残高
  note: string;
};

export type RateChange = {
  id: string;
  date: string;       // YYYY-MM-DD（この月から適用）
  annualRate: number; // 年利（%）
};

export type Loan = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  currentBalance: number;
  annualRate: number;          // 初期金利
  monthlyPayment: number;      // 定額方式の月次返済額
  repayType?: "fixed" | "principal_equal" | "revolving";
  principalPerMonth?: number;  // 元金均等：毎月の固定元金返済額
  bonusPayment?: number;       // ボーナス払い：追加返済額
  bonusMonths?: number[];      // ボーナス払い：対象月（例：[6,12]）
  revolvingRate?: number;      // リボ：毎月支払い率（%）例：1.0
  revolvingMin?: number;       // リボ：最低支払額（円）例：5000
  charges?: Charge[];          // リボ：残高増加記録
  startDate: string;
  paymentDay: number;
  color: string;
  note: string;
  payments: Payment[];
  rateChanges: RateChange[];
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  version: 1;
  loans: Loan[];
  settings: {
    currency: "JPY";
    theme: "light" | "dark";
  };
};
