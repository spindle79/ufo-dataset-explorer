"use client";

import React from "react";
import Modal from "./Modal";
import FormButton from "./FormButton";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "secondary" | "danger" | "success" | "purple";
  itemName?: string;
  loading?: boolean;
  loadingLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  itemName,
  loading = false,
  loadingLabel,
  maxWidth = "md",
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={maxWidth}>
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
        {itemName && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {itemName}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <FormButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </FormButton>
          <FormButton
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {loading && loadingLabel ? loadingLabel : confirmLabel}
          </FormButton>
        </div>
      </div>
    </Modal>
  );
}

