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

type MortgageResult = {
  principalAndInterest: number;
  monthlyTax: number;
  monthlyInsurance: number;
  totalMonthly: number;
  loanAmount: number;
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

function parseOptionalNonNegative(value: string, label: string) {
  if (!value.trim()) return 0;
  return parseNonNegativeNumber(value, label);
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function monthlyPayment(principal: number, annualRate: number, years: number) {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

function calculateMortgage(
  homePrice: number,
  downPayment: number,
  annualRate: number,
  years: number,
  propertyTaxYearly: number,
  insuranceYearly: number,
): MortgageResult {
  if (downPayment >= homePrice) {
    throw new Error("Down payment must be less than the home price.");
  }

  const loanAmount = homePrice - downPayment;
  const principalAndInterest = monthlyPayment(loanAmount, annualRate, years);
  const monthlyTax = propertyTaxYearly / 12;
  const monthlyInsurance = insuranceYearly / 12;

  return {
    principalAndInterest,
    monthlyTax,
    monthlyInsurance,
    totalMonthly: principalAndInterest + monthlyTax + monthlyInsurance,
    loanAmount,
  };
}

export default function MortgageCalculatorTool() {
  const [homePrice, setHomePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [propertyTax, setPropertyTax] = useState("");
  const [insurance, setInsurance] = useState("");
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setResult(
        calculateMortgage(
          parsePositiveNumber(homePrice, "home price"),
          parseNonNegativeNumber(downPayment, "down payment"),
          parseNonNegativeNumber(rate, "annual interest rate"),
          parsePositiveNumber(years, "loan term"),
          parseOptionalNonNegative(propertyTax, "yearly property tax"),
          parseOptionalNonNegative(insurance, "yearly insurance"),
        ),
      );
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate mortgage.");
    }
  };

  const clear = () => {
    setHomePrice("");
    setDownPayment("");
    setRate("");
    setYears("");
    setPropertyTax("");
    setInsurance("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Home price</ToolLabel>
          <ToolInput value={homePrice} onChange={setHomePrice} type="number" placeholder="450000" />
        </div>
        <div>
          <ToolLabel>Down payment</ToolLabel>
          <ToolInput value={downPayment} onChange={setDownPayment} type="number" placeholder="90000" />
        </div>
        <div>
          <ToolLabel>Annual interest rate (%)</ToolLabel>
          <ToolInput value={rate} onChange={setRate} type="number" placeholder="6.75" />
        </div>
        <div>
          <ToolLabel>Loan term (years)</ToolLabel>
          <ToolInput value={years} onChange={setYears} type="number" placeholder="30" />
        </div>
        <div>
          <ToolLabel>Property tax yearly (optional)</ToolLabel>
          <ToolInput value={propertyTax} onChange={setPropertyTax} type="number" placeholder="5400" />
        </div>
        <div>
          <ToolLabel>Insurance yearly (optional)</ToolLabel>
          <ToolInput value={insurance} onChange={setInsurance} type="number" placeholder="1800" />
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
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToolStatCard label="Loan amount" value={formatCurrency(result.loanAmount)} />
            <ToolStatCard label="Principal and interest" value={formatCurrency(result.principalAndInterest)} />
            <ToolStatCard label="Monthly taxes" value={formatCurrency(result.monthlyTax)} />
            <ToolStatCard label="Monthly insurance" value={formatCurrency(result.monthlyInsurance)} />
            <ToolStatCard label="Total monthly estimate" value={formatCurrency(result.totalMonthly)} />
          </div>
          <ToolResultBox muted>
            Estimate only. It excludes items such as PMI, HOA fees, closing costs, and lender-specific fees.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Mortgage payment estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
