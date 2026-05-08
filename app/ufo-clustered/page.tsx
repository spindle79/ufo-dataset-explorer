import UfoClusteredExplorer from "../components/UfoClusteredExplorer";
import Breadcrumbs from "../components/shared/Breadcrumbs";
import { Search } from "lucide-react";

export default function UfoClusteredPage() {
  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "UFO Clustered Dataset",
              icon: <Search className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            UFO Clustered Dataset Explorer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore the cleaned and unified UFO sightings dataset (~327k rows)
            from{" "}
            <a
              href="https://huggingface.co/datasets/cjc0013/Ufo_data_clustered"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              cjc0013/Ufo_data_clustered
            </a>
            . This dataset merges several publicly available UFO sighting
            datasets from Kaggle into one cleaned, standardized, and enriched
            file.
          </p>
        </div>
        <UfoClusteredExplorer initialLimit={50} />
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong>Credits:</strong> This dataset is provided by{" "}
            <a
              href="https://www.reddit.com/r/UFOs/comments/1oz3i0h/im_releasing_a_cleaned_enriched_ufo_dataset_327k/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reddit user
            </a>
            . Dataset available on{" "}
            <a
              href="https://huggingface.co/datasets/cjc0013/Ufo_data_clustered"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Hugging Face
            </a>
            . Source code available on{" "}
            <a
              href="https://github.com/mcloide/Ufo_data_clustered"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
