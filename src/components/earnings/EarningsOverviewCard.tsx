"use client";

import React from "react";

interface EarningsOverviewCardProps {
  rate: number;
  tempRate: number;
  setTempRate: (val: number) => void;
  onSaveRate: () => void;
  isSavedNotice: boolean;
}

export default function EarningsOverviewCard({
  rate,
  tempRate,
  setTempRate,
  onSaveRate,
  isSavedNotice,
}: EarningsOverviewCardProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-medium text-[#15191C]">Earnings Overview</h2>
        <p className="text-xs text-[#4B4F52] mt-0.5">
          Per-head billing · ${rate.toFixed(2)} / invitee (current rate)
        </p>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 space-y-6">
        {/* Main Flex Layout directly inside the outer card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
          {/* Left Side Rate Text (No extra box wrapper) */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-[#FF651D]">
                ${rate.toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#4B4F52]">Per head</span>
            </div>
            <p className="text-sm text-[#4B4F52]">
              Per-head billing · ${rate.toFixed(2)} / invitee (current rate)
            </p>
          </div>

          {/* Right Side Adjust Rate Box */}
          <div className="bg-[#F7F7F7] rounded-md p-4 max-w-[480px] w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#4B4F52] tracking-wide uppercase">
                ADJUST RATE
              </span>
              {isSavedNotice && (
                <span className="text-xs font-semibold text-emerald-600 animate-fadeIn">
                  Rate applied to estimates (not stored on server)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={tempRate}
                  onChange={(e) => setTempRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5B22]"
                />
                <div className="flex items-center justify-between text-xs font-medium text-[#828282] px-0.5">
                  <span>$1</span>
                  <span>$10</span>
                  <span>$20</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSaveRate}
                className="px-5 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
