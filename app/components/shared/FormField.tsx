"use client";

import React from "react";
import FormLabel from "./FormLabel";
import FormError from "./FormError";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  description,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}
      {description && (
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {children}
      {error && <FormError message={error} className="mt-2" />}
    </div>
  );
}
