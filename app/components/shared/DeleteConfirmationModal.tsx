"use client";

import React from "react";
import ConfirmationModal from "./ConfirmationModal";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "item",
  loading = false,
}: DeleteConfirmationModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirm Delete"
      message={`Are you sure you want to delete this ${itemType} file? This action cannot be undone.`}
      confirmLabel="Delete"
      confirmVariant="danger"
      itemName={itemName}
      loading={loading}
      loadingLabel="Deleting..."
    />
  );
}

