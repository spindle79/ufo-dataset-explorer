"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface FormButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: "primary" | "secondary" | "danger" | "success" | "purple";
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function FormButton({
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  children,
  ...props
}: FormButtonProps) {
  const baseClasses =
    "px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    purple: "bg-purple-600 text-white hover:bg-purple-700",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
