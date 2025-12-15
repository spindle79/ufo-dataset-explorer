"use client";

import { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  children,
}: TabsProps) {
  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300/50 dark:text-gray-400 dark:hover:text-gray-300"
                }
              `}
            >
              {tab.icon && (
                <span className="w-4 h-4 flex items-center">{tab.icon}</span>
              )}
              <span className="ml-2.5">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
