"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface CardGridProps {
  children: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function CardGrid({
  children,
  loading = false,
  emptyMessage = "No items found",
  className = "",
}: CardGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  const childrenArray = Array.isArray(children) ? children : [children];
  const hasChildren = childrenArray.some((child) => child !== null && child !== undefined);

  if (!hasChildren) {
    return (
      <div className="text-center py-16 text-gray-600 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

