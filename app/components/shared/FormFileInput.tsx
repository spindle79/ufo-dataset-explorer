"use client";

import React from "react";

interface FormFileInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "className" | "onChange"
  > {
  className?: string;
  accept?: string;
  onFileSelected?: (file: File | null) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FormFileInput({
  className = "",
  accept,
  onFileSelected,
  onChange,
  ...props
}: FormFileInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (onFileSelected) {
      onFileSelected(file);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      type="file"
      accept={accept}
      onChange={handleChange}
      className={`block w-full text-sm text-gray-500 dark:text-gray-400
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100
        dark:file:bg-blue-900 dark:file:text-blue-300 ${className}`}
      {...props}
    />
  );
}
