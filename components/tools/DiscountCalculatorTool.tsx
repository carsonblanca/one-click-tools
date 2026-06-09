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

type DiscountResult = {
  discountAmount: number;
  priceAfterDiscount: number;
  taxAmount: number;
  finalPrice: number;
};

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

export default function DiscountCalculatorTool() {
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [result, setResult] = useState<DiscountResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const price = parseNonNegativeNumber(originalPrice, "original price");
      const discount = parseNonNegativeNumber(discountPercent, "discount percentage");
      const tax = parseOptionalNonNegative(taxPercent, "tax percentage");

      if (discount > 100) {
        throw new Error("Discount percentage cannot be greater than 100.");
      }

      const discountAmount = price * (discount / 100);
      const priceAfterDiscount = price - discountAmount;
      const taxAmount = priceAfterDiscount * (tax / 100);

      setResult({
        discountAmount,
        priceAfterDiscount,
        taxAmount,
        finalPrice: priceAfterDiscount + taxAmount,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate discount.");
    }
  };

  const clear = () => {
    setOriginalPrice("");
    setDiscountPercent("");
    setTaxPercent("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Original price</ToolLabel>
          <ToolInput value={originalPrice} onChange={setOriginalPrice} type="number" placeholder="120" />
        </div>
        <div>
          <ToolLabel>Discount (%)</ToolLabel>
          <ToolInput value={discountPercent} onChange={setDiscountPercent} type="number" placeholder="20" />
        </div>
        <div>
          <ToolLabel>Tax (%) optional</ToolLabel>
          <ToolInput value={taxPercent} onChange={setTaxPercent} type="number" placeholder="8.25" />
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
            <ToolStatCard label="Discount amount" value={formatCurrency(result.discountAmount)} />
            <ToolStatCard label="Price after discount" value={formatCurrency(result.priceAfterDiscount)} />
            <ToolStatCard label="Tax amount" value={formatCurrency(result.taxAmount)} />
            <ToolStatCard label="Final price" value={formatCurrency(result.finalPrice)} />
          </div>
          <ToolResultBox muted>
            Estimate only. Actual checkout totals can vary because of fees, shipping, local tax rules, or rounding.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Discount and final price results will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
