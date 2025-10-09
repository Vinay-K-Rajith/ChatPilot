import KnowledgeBaseCard from '../KnowledgeBaseCard';

export default function KnowledgeBaseCardExample() {
  const mockDocument = {
    id: "1",
    title: "Product Specifications - Steel Sheets",
    category: "Products",
    fileName: "steel-specs-2024.pdf",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    content: "Comprehensive specifications for all steel sheet products including dimensions, grades, and applications...",
  };

  return (
    <div className="w-96">
      <KnowledgeBaseCard document={mockDocument} />
    </div>
  );
}
