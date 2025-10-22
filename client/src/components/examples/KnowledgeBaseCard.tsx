import KnowledgeBaseCard from '../KnowledgeBaseCard';

export default function KnowledgeBaseCardExample() {
  const mockDocument = {
    _id: "1",
    type: "pdf" as const,
    title: "Product Specifications - Steel Sheets",
    category: "Products",
    fileName: "steel-specs-2024.pdf",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    extractedText: "Comprehensive specifications for all steel sheet products including dimensions, grades, and applications for construction and industrial use.",
    fileUrl: "/uploads/knowledge/steel-specs-2024.pdf",
    fileSize: 1024000,
    pageCount: 12,
  };

  return (
    <div className="w-96">
      <KnowledgeBaseCard document={mockDocument} />
    </div>
  );
}
