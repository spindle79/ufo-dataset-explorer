import DatasetExplorer from "../components/DatasetExplorer";
import Navigation from "../components/Navigation";

export default function ExplorerPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Navigation showBackButton={true} />
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
