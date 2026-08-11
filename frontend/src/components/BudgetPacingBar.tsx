'use client';

import React from 'react';

interface BudgetPacingBarProps {
  spent: number;
  budget: number;
  compact?: boolean;
}

export default function BudgetPacingBar({ spent, budget, compact = false }: BudgetPacingBarProps) {
  const safeBudget = Math.max(1, budget);
  const percentage = Math.min(200, Math.round((spent / safeBudget) * 100));

  let barColor = 'bg-success';
  let badgeColor = 'bg-success/10 text-success';
  if (percentage >= 80 && percentage <= 100) {
    barColor = 'bg-warning';
    badgeColor = 'bg-warning/10 text-warning';
  } else if (percentage > 100) {
    barColor = 'bg-error';
    badgeColor = 'bg-error/10 text-error';
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${badgeColor} px-1.5 py-0.5 rounded-sm`}>
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-500">Budget Pacing</span>
        <span className={`font-bold ${badgeColor} px-2 py-0.5 rounded-full text-[11px]`}>
          ${spent.toLocaleString()} / ${budget.toLocaleString()} ({percentage}%)
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
