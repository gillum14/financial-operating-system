"use client";

import { CATEGORY_COLOR_OPTIONS, type CategoryColorOption } from "@/lib/category-color";

export function ColorSwatchPicker({
  value,
  onChange,
  idPrefix,
}: {
  value: CategoryColorOption;
  onChange: (color: CategoryColorOption) => void;
  idPrefix: string;
}) {
  return (
    <div>
      <p className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]" id={`${idPrefix}-color-label`}>
        Color
      </p>
      <div role="radiogroup" aria-labelledby={`${idPrefix}-color-label`} className="flex flex-wrap gap-2">
        {CATEGORY_COLOR_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            aria-label={option}
            onClick={() => onChange(option)}
            className={`h-7 w-7 shrink-0 rounded-full transition-shadow ${
              value === option ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]" : ""
            }`}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>
    </div>
  );
}
