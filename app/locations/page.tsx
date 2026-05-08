import Breadcrumbs from "../components/shared/Breadcrumbs";
import LocationsExplorer from "../components/LocationsExplorer";
import { MapPin } from "lucide-react";

export default function LocationsPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Locations",
              icon: <MapPin className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Locations Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore and manage locations referenced in the dataset. View names,
            aliases, geographic coordinates, and address information.
          </p>
        </div>
        <LocationsExplorer />
      </div>
    </main>
  );
}
