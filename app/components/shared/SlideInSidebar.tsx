"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SlideInSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export default function SlideInSidebar({
  isOpen,
  onClose,
  title,
  children,
  width = "w-[30vw]",
}: SlideInSidebarProps) {
  // Shared transition values for synchronized animations
  const TRANSITION_DURATION = "0.3s";
  const TRANSITION_TIMING = "ease-in-out";
  const TRANSITION = `transform ${TRANSITION_DURATION} ${TRANSITION_TIMING}`;

  useEffect(() => {
    if (isOpen) {
      // Shift main content to make room for sidebar (30vw)
      const mainContent = document.querySelector("main");
      
      if (mainContent) {
        mainContent.style.transition = TRANSITION;
        mainContent.style.transform = "translateX(-30vw)";
      }
    } else {
      // Reset main content
      const mainContent = document.querySelector("main");
      
      if (mainContent) {
        mainContent.style.transition = TRANSITION;
        mainContent.style.transform = "translateX(0)";
      }
    }
    
    return () => {
      // Cleanup on unmount
      const mainContent = document.querySelector("main");
      
      if (mainContent) {
        mainContent.style.transform = "translateX(0)";
      }
    };
  }, [isOpen, TRANSITION]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sidebarContent = (
    <div
      className="fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700"
      style={{
        width: "30vw",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: TRANSITION,
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  // Use portal to render at document root to avoid parent layout constraints
  if (typeof window !== "undefined") {
    return createPortal(sidebarContent, document.body);
  }

  return null;
}

