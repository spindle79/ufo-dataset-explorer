import Navigation from "../components/Navigation";
import PeopleExplorer from "../components/PeopleExplorer";

export default function PeoplePage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Navigation showBackButton={true} />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">People Explorer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore and manage people referenced in the dataset. View names,
            aliases, and related information.
          </p>
        </div>
        <PeopleExplorer />
      </div>
    </main>
  );
}
