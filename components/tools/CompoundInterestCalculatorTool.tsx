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

type Frequency = 1 | 4 | 12 | 365;

type CompoundResult = {
  finalBalance: number;
  totalContributions: number;
  interestEarned: number;
};

const frequencies: Array<{ label: string; value: Frequency }> = [
  { label: "Annually", value: 1 },
  { label: "Quarterly", value: 4 },
  { label: "Monthly", value: 12 },
  { label: "Daily", value: 365 },
];

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

function calculateCompoundInterest(
  principal: number,
  annualContribution: number,
  annualRate: number,
  years: number,
  frequency: Frequency,
): CompoundResult {
  const periods = Math.max(1, Math.round(years * frequency));
  const periodicRate = annualRate / 100 / frequency;
  const periodicContribution = annualContribution / frequency;
  let balance = principal;

  for (let period = 0; period < periods; period += 1) {
    balance = balance * (1 + periodicRate) + periodicContribution;
  }

  const totalContributions = principal + periodicContribution * periods;

  return {
    finalBalance: balance,
    totalContributions,
    interestEarned: balance - totalContributions,
  };
}

export default function CompoundInterestCalculatorTool() {
  const [principal, setPrincipal] = useState("");
  const [contribution, setContribution] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(12);
  const [result, setResult] = useState<CompoundResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setResult(
        calculateCompoundInterest(
          parseNonNegativeNumber(principal, "initial principal"),
          parseNonNegativeNumber(contribution, "annual contribution"),
          parseNonNegativeNumber(rate, "annual interest rate"),
          parsePositiveNumber(years, "number of years"),
          frequency,
        ),
      );
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate compound interest.");
    }
  };

  const clear = () => {
    setPrincipal("");
    setContribution("");
    setRate("");
    setYears("");
    setFrequency(12);
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Initial principal</ToolLabel>
          <ToolInput value={principal} onChange={setPrincipal} type="number" placeholder="10000" />
        </div>
        <div>
          <ToolLabel>Annual contribution</ToolLabel>
          <ToolInput value={contribution} onChange={setContribution} type="number" placeholder="2400" />
        </div>
        <div>
          <ToolLabel>Annual interest rate (%)</ToolLabel>
          <ToolInput value={rate} onChange={setRate} type="number" placeholder="7" />
        </div>
        <div>
          <ToolLabel>Years</ToolLabel>
          <ToolInput value={years} onChange={setYears} type="number" placeholder="10" />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Compounding frequency</ToolLabel>
        <ToolButtonRow>
          {frequencies.map((item) => (
            <ToolButton
              key={item.value}
              onClick={() => {
                setFrequency(item.value);
                setResult(null);
                setError("");
              }}
              variant={frequency === item.value ? "primary" : "secondary"}
            >
              {item.label}
            </ToolButton>
          ))}
        </ToolButtonRow>
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
            <ToolStatCard label="Final balance" value={formatCurrency(result.finalBalance)} />
            <ToolStatCard label="Total contributions" value={formatCurrency(result.totalContributions)} />
            <ToolStatCard label="Interest earned" value={formatCurrency(result.interestEarned)} />
          </div>
          <ToolResultBox muted>
            Estimate only. Returns, contribution timing, taxes, and fees can change the actual result.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Compound growth estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
