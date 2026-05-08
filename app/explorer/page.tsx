import DatasetExplorer from "../components/DatasetExplorer";
import Breadcrumbs from "../components/shared/Breadcrumbs";
import { Search } from "lucide-react";

export default function ExplorerPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Dataset Explorer",
              icon: <Search className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Dataset Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore approximately 327,000 UFO sighting reports from the Hugging
            Face dataset
          </p>
        </div>
        <DatasetExplorer />
      </div>
    </main>
  );
}
