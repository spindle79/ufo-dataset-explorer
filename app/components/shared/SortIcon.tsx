"use client";

import React from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";

interface SortIconProps {
  currentField: string;
  sortField: string;
  sortOrder: "asc" | "desc";
}

export default function SortIcon({
  currentField,
  sortField,
  sortOrder,
}: SortIconProps) {
  if (currentField !== sortField) {
    return <Minus className="w-4 h-4 text-gray-400" />;
  }
  return sortOrder === "asc" ? (
    <ChevronUp className="w-4 h-4" />
  ) : (
    <ChevronDown className="w-4 h-4" />
  );
}

