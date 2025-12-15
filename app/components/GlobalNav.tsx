"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMiniappsData } from "../lib/miniapps";

export default function GlobalNav() {
  const pathname = usePathname();
  const miniapps = getMiniappsData();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Home link */}
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            <span className="text-lg font-semibold">UFO Explorer</span>
          </Link>

          {/* Mini app icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {miniapps.map((miniapp) => {
              const IconComponent = miniapp.iconComponent;
              const isActive =
                pathname === miniapp.href ||
                pathname.startsWith(miniapp.href + "/");

              return (
                <Link
                  key={miniapp.id}
                  href={miniapp.href}
                  className={`
                    relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11
                    rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    }
                  `}
                  title={miniapp.title}
                  aria-label={miniapp.title}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
