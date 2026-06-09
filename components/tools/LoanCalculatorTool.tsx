"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type LoanResult = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
};

function parsePositiveNumber(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseNonNegativeNumber(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Enter a valid ${label} of zero or more.`);
  }

  return parsed;
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function calculateLoan(amount: number, annualRate: number, years: number): LoanResult {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? amount / months
      : (amount * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
  const totalPayment = monthlyPayment * months;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest: totalPayment - amount,
  };
}

export default function LoanCalculatorTool() {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<LoanResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setResult(
        calculateLoan(
          parsePositiveNumber(amount, "loan amount"),
          parseNonNegativeNumber(rate, "annual interest rate"),
          parsePositiveNumber(years, "loan term"),
        ),
      );
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate loan.");
    }
  };

  const clear = () => {
    setAmount("");
    setRate("");
    setYears("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Loan amount</ToolLabel>
          <ToolInput value={amount} onChange={setAmount} type="number" placeholder="25000" />
        </div>
        <div>
          <ToolLabel>Annual interest rate (%)</ToolLabel>
          <ToolInput value={rate} onChange={setRate} type="number" placeholder="6.5" />
        </div>
        <div>
          <ToolLabel>Loan term (years)</ToolLabel>
          <ToolInput value={years} onChange={setYears} type="number" placeholder="5" />
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={calculate}>Calculate</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ToolStatCard label="Monthly payment" value={formatCurrency(result.monthlyPayment)} />
            <ToolStatCard label="Total payment" value={formatCurrency(result.totalPayment)} />
            <ToolStatCard label="Total interest" value={formatCurrency(result.totalInterest)} />
          </div>
          <ToolResultBox muted>
            Estimate only. Actual loan terms, fees, and payment schedules may vary and are not financial advice.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Loan payment estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
