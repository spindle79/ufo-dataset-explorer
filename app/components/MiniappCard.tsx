'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export interface Miniapp {
  id: string;
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  badge?: string;
}

interface MiniappCardProps {
  miniapp: Miniapp;
}

export default function MiniappCard({ miniapp }: MiniappCardProps) {
  return (
    <Link
      href={miniapp.href}
      className="block bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200/50 dark:border-gray-700/50"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {miniapp.icon && (
              <span className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300" role="img" aria-label={miniapp.title}>
                {miniapp.icon}
              </span>
            )}
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {miniapp.title}
            </h3>
          </div>
          {miniapp.badge && (
            <span className="px-2 py-1 text-xs bg-blue-100/80 dark:bg-blue-900/80 backdrop-blur-sm text-blue-800 dark:text-blue-200 rounded-full">
              {miniapp.badge}
            </span>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {miniapp.description}
        </p>
      </div>
    </Link>
  );
}

