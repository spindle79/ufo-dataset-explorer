"use client";

import React from "react";

interface FormTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  className?: string;
  error?: boolean;
}

export default function FormTextarea({
  className = "",
  error = false,
  ...props
}: FormTextareaProps) {
  const baseClasses =
    "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white";
  const errorClasses = error
    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300";

  return (
    <textarea
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}
