import Breadcrumbs from "../components/shared/Breadcrumbs";
import PeopleExplorer from "../components/PeopleExplorer";
import Link from "next/link";
import { GitMerge, Users } from "lucide-react";

export default function PeoplePage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "People",
              icon: <Users className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-4">People Explorer</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Explore and manage people referenced in the dataset. View names,
                aliases, and related information.
              </p>
            </div>
            <Link
              href="/people/duplicates"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <GitMerge className="w-4 h-4" />
              Review Duplicates
            </Link>
          </div>
        </div>
        <PeopleExplorer />
      </div>
    </main>
  );
}
