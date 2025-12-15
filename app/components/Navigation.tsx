'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface NavigationProps {
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export default function Navigation({ 
  title = 'UFO Dataset Explorer',
  showBackButton = false,
  backHref = '/'
}: NavigationProps) {
  return (
    <nav className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Link
            href={backHref}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        )}
        {!showBackButton && (
          <Link
            href="/"
            className="text-2xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            {title}
          </Link>
        )}
      </div>
    </nav>
  );
}

