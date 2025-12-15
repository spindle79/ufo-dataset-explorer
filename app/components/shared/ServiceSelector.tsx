'use client';

import React from 'react';

export interface ServiceOption {
  key: string;
  label: string;
  description?: string;
}

interface ServiceSelectorProps {
  services: ServiceOption[];
  selectedServices: Record<string, boolean>;
  onServiceChange: (serviceKey: string, checked: boolean) => void;
  className?: string;
}

export default function ServiceSelector({
  services,
  selectedServices,
  onServiceChange,
  className = '',
}: ServiceSelectorProps) {
  return (
    <div className={`p-4 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="text-sm font-medium mb-3">Select Services:</div>
      <div className="space-y-2">
        {services.map((service) => (
          <label key={service.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedServices[service.key] || false}
              onChange={(e) => onServiceChange(service.key, e.target.checked)}
              className="w-4 h-4"
            />
            <div className="flex flex-col">
              <span className="text-sm">{service.label}</span>
              {service.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{service.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

