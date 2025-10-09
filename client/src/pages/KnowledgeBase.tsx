import KnowledgeBaseCard from "@/components/KnowledgeBaseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search } from "lucide-react";
import { useState } from "react";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");

  const documents = [
    {
      id: "1",
      title: "Product Specifications - Steel Sheets",
      category: "Products",
      fileName: "steel-specs-2024.pdf",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      content: "Comprehensive specifications for all steel sheet products including dimensions, grades, and applications for construction and industrial use.",
    },
    {
      id: "2",
      title: "Pricing Guide - Aluminum Products",
      category: "Pricing",
      fileName: "aluminum-pricing-q1.pdf",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      content: "Complete pricing information for aluminum products, including volume discounts and special offers for Q1 2024.",
    },
    {
      id: "3",
      title: "FAQ - Common Customer Questions",
      category: "Support",
      fileName: "customer-faq.pdf",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      content: "Answers to frequently asked questions about product specifications, delivery, payment terms, and technical support.",
    },
    {
      id: "4",
      title: "Installation Guidelines",
      category: "Technical",
      fileName: "installation-guide.pdf",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      content: "Step-by-step installation instructions for various metal products, including safety requirements and best practices.",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-header rounded-lg p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-white/80 mt-1">Manage documents for AI responses</p>
        </div>
        <Button variant="secondary" data-testid="button-upload-document">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-documents"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <KnowledgeBaseCard
            key={doc.id}
            document={doc}
            onDelete={(id) => console.log("Delete document:", id)}
            onDownload={(id) => console.log("Download document:", id)}
          />
        ))}
      </div>
    </div>
  );
}
