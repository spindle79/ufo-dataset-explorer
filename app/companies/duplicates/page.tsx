import DuplicateManager from "@/components/shared/DuplicateManager";

export default function CompaniesDuplicatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DuplicateManager entityType="companies" />
    </div>
  );
}

