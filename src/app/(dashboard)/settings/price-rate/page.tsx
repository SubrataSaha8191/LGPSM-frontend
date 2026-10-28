"use client";

import PageHeader from "@/components/common/PageHeader";
import React, { useState } from "react";
import PricePerHeadCard from "@/components/settings/PricePerHeadCard";
import PriceHistoryTable from "@/components/settings/PriceHistoryTable";
import { PriceHistoryRecord } from "@/types/priceRate";

export default function PriceRateSettingsPage() {
  const [currentRate, setCurrentRate] = useState<number>(3.0);
  // No price-rate API exists yet: changes live only in this page session
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);

  const handleSaveRate = (newRateVal: number) => {
    if (newRateVal === currentRate) return;

    const record: PriceHistoryRecord = {
      id: Date.now().toString(),
      dateTime: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      previousRate: currentRate,
      newRate: newRateVal,
      changeType: newRateVal > currentRate ? "Increase" : "Decrease",
      status: "Active",
    };

    setHistory((prev) => [
      record,
      ...prev.map((item) => ({ ...item, status: "Suspended" as const })),
    ]);
    setCurrentRate(newRateVal);
  };

  return (
    <div className="w-full min-h-full bg-white">
      {/* Header */}
      <PageHeader title="Price Rate Settings" />

      {/* Page Content */}
      <div className="px-4 sm:px-6 pt-7 w-full space-y-6 pb-24">
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
          Price-rate changes are not stored on the server yet. They apply to this session only and reset on reload.
        </div>
        <PricePerHeadCard currentRate={currentRate} onSaveRate={handleSaveRate} />
        <PriceHistoryTable history={history} />
      </div>
    </div>
  );
}
