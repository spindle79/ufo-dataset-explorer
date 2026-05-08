import DuplicateManager from "@/components/shared/DuplicateManager";

export default function PdfDuplicatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DuplicateManager entityType="pdf" />
    </div>
  );
}

