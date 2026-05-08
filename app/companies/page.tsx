import Breadcrumbs from "../components/shared/Breadcrumbs";
import CompaniesExplorer from "../components/CompaniesExplorer";
import { Building2 } from "lucide-react";

export default function CompaniesPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Companies",
              icon: <Building2 className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Companies Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore and manage companies referenced in the dataset. View names,
            aliases, and related information.
          </p>
        </div>
        <CompaniesExplorer />
      </div>
    </main>
  );
}

