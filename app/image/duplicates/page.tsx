import DuplicateManager from "@/components/shared/DuplicateManager";

export default function ImageDuplicatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DuplicateManager entityType="image" />
    </div>
  );
}

