import UdbExplorer from "../components/UdbExplorer";
import Breadcrumbs from "../components/shared/Breadcrumbs";
import { Database } from "lucide-react";

export default function UdbPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "UDB",
              icon: <Database className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">UDB Database Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore the Larry Hatch UFO Database (UDB) - a curated collection of
            historical UFO sighting records with detailed metadata, credibility
            ratings, and strangeness scores.
          </p>
        </div>
        <UdbExplorer />
      </div>
    </main>
  );
}
