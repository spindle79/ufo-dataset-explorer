import Navigation from "../components/Navigation";
import LocationsExplorer from "../components/LocationsExplorer";

export default function LocationsPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Navigation showBackButton={true} />
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
