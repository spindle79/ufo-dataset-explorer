import Breadcrumbs from "@/components/shared/Breadcrumbs";
import DuplicateManager from "@/components/shared/DuplicateManager";
import { Music } from "lucide-react";

export default function AudioDuplicatesPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <Breadcrumbs
        items={[
          {
            label: "Audio",
            href: "/audio",
            icon: <Music className="w-4 h-4" />,
          },
          {
            label: "Duplicates",
            icon: <Music className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Review Audio Duplicates</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Review and merge potential duplicate audio files
        </p>
      </div>
      <DuplicateManager entityType="audio" />
    </main>
  );
}

