"use client";

import React from "react";
import ConfirmationModal from "./ConfirmationModal";

interface ExcludeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

export default function ExcludeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: ExcludeConfirmationModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirm Exclude"
      message="Are you sure you want to exclude this file from the table?"
      confirmLabel="Exclude"
      confirmVariant="danger"
      itemName={itemName}
    />
  );
}

