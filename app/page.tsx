import { getAllMiniapps } from "./lib/miniapps";
import MiniappCard from "./components/MiniappCard";

export default function Home() {
  const miniapps = getAllMiniapps();

  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">UFO Dataset Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            A collection of tools and applications for exploring UFO sighting
            data
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {miniapps.map((miniapp) => (
            <MiniappCard key={miniapp.id} miniapp={miniapp} />
          ))}
        </div>

        {miniapps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No miniapps available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
