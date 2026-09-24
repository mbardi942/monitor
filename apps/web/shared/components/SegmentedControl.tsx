"use client";

import React from "react";

interface Option<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
  fullWidth = true,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={`flex p-1 bg-neutral-950/40 border border-neutral-800/80 rounded-[var(--radius-inner)] ${
        fullWidth ? "w-full" : "w-fit"
      } ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[calc(var(--radius-inner)-4px)] text-xs font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary)/0.6)] ${
              isSelected
                ? "bg-neutral-900 border border-[hsl(var(--primary)/0.45)] text-[hsl(var(--primary))] shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_12px_rgba(6,182,212,0.15)] font-semibold"
                : "text-neutral-400 border border-transparent hover:text-neutral-200 hover:bg-neutral-800/20"
            }`}
          >
            {option.icon && (
              <span className={`w-3.5 h-3.5 transition-colors ${isSelected ? "text-[hsl(var(--primary))]" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
