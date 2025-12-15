"use client";

import React from "react";

interface FormCheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "className"
  > {
  label?: string;
  description?: string;
  className?: string;
  labelClassName?: string;
}

export default function FormCheckbox({
  label,
  description,
  className = "",
  labelClassName = "",
  ...props
}: FormCheckboxProps) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${labelClassName}`}
    >
      <input type="checkbox" className={`w-4 h-4 ${className}`} {...props} />
      {label && (
        <div className="flex flex-col">
          <span className="text-sm">{label}</span>
          {description && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
