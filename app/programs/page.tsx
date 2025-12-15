import Navigation from "../components/Navigation";
import ProgramsExplorer from "../components/ProgramsExplorer";

export default function ProgramsPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Navigation showBackButton={true} />
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
