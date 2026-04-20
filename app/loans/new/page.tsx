"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoanForm from "@/components/LoanForm";
import { loadData, upsertLoan } from "@/lib/storage";

export default function NewLoanPage() {
  const router = useRouter();
  const [usedColors, setUsedColors] = useState<string[]>([]);

  useEffect(() => {
    setUsedColors(loadData().loans.map((l) => l.color));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">新しい借入を登録</h1>
      <LoanForm
        submitLabel="登録する"
        usedColors={usedColors}
        onSubmit={(loan) => {
          upsertLoan(loan);
          router.push(`/loans/${loan.id}`);
        }}
      />
    </div>
  );
}
