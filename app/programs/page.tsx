import Breadcrumbs from "../components/shared/Breadcrumbs";
import ProgramsExplorer from "../components/ProgramsExplorer";
import { FolderKanban } from "lucide-react";

export default function ProgramsPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Programs",
              icon: <FolderKanban className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Programs Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore and manage programs referenced in the dataset. View names,
            aliases, and descriptions.
          </p>
        </div>
        <ProgramsExplorer />
      </div>
    </main>
  );
}
