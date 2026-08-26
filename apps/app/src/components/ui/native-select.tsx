"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type NativeSelectOption = {
  value: string;
  label: string;
};

type NativeSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: NativeSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function NativeSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  triggerClassName,
  "data-testid": testId,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: NativeSelectProps) {
  const selectValue = value === "" ? "__empty__" : value;

  return (
    <div className={cn("relative w-full", className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => onValueChange(e.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value || "__empty__"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Select
        value={selectValue}
        onValueChange={(next) => onValueChange(next === "__empty__" ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn("h-11 min-h-11 w-full bg-card px-3 text-sm shadow-xs", triggerClassName)}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {placeholder ? <SelectItem value="__empty__">{placeholder}</SelectItem> : null}
          {options
            .filter((opt) => opt.value !== "")
            .map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
