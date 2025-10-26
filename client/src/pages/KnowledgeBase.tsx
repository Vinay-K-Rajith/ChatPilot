import React, { useState, useCallback, useEffect } from "react";
import KnowledgeBaseCard from "@/components/KnowledgeBaseCard";
import { PdfProcessor } from "@/components/PdfProcessor";
import { ArticleForm } from "@/components/ArticleForm";
import { ArticleViewModal } from "@/components/ArticleViewModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Search, Plus, Filter } from "lucide-react";
import { useKnowledgeDocuments, useDeleteKnowledgeDocument } from "@/hooks/useKnowledgeBase";
import { KNOWLEDGE_CATEGORIES } from '../../../shared/knowledge';
import type { KnowledgeDocument, LegacyArticle } from '../../../shared/knowledge';

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<"article" | "pdf">("article");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isArticleFormOpen, setIsArticleFormOpen] = useState(false);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<LegacyArticle | null>(null);
  const [viewingArticle, setViewingArticle] = useState<KnowledgeDocument | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string>('');
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Fetch documents based on current tab and filters
  const { data: documentsData, isLoading, error, refetch } = useKnowledgeDocuments({
    type: activeTab,
    search: debouncedSearchQuery || undefined,
    category: selectedCategory && selectedCategory !== 'all' ? selectedCategory : undefined,
  });
  
  const deleteDocument = useDeleteKnowledgeDocument();
  
  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument.mutateAsync(id);
      } catch (error: any) {
        alert(`Failed to delete document: ${error.message}`);
      }
    }
  };
  
  const handlePdfTextExtracted = (text: string) => {
    setExtractedPdfText(text);
    // You can add additional logic here, like sending to OpenAI or storing in context
  };
  
  const handleViewArticle = (document: KnowledgeDocument) => {
    setViewingArticle(document);
    setIsArticleViewOpen(true);
  };
  
  const handleEditArticle = (document: KnowledgeDocument) => {
    // Convert KnowledgeDocument to LegacyArticle for editing
    const legacyArticle: LegacyArticle = {
      _id: document._id,
      title: document.title || '',
      content: document.content || document.extractedText || '',
      category: document.category
    };
    setEditingArticle(legacyArticle);
    setIsArticleFormOpen(true);
  };
  
  const handleEditFromView = () => {
    if (viewingArticle) {
      handleEditArticle(viewingArticle);
      setIsArticleViewOpen(false);
    }
  };
  
  const handleCreateArticle = () => {
    setEditingArticle(null);
    setIsArticleFormOpen(true);
  };
  
  const handleCloseArticleForm = () => {
    setIsArticleFormOpen(false);
    setEditingArticle(null);
  };
  
  const handleCloseArticleView = () => {
    setIsArticleViewOpen(false);
    setViewingArticle(null);
  };
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('all');
  }, []);

  return (
    <div className="p-6 space-y-6 overflow-hidden">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{
            backgroundImage: 'url(https://www.openmindt.com/wp-content/uploads/2024/12/marketingopenmind-automation-systems-linked-to-each-other-progr-ed68d0cb-ea15-4d2f-8801-f4d619eff529.png)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#2C5F8D]/90 to-[#4A90BF]/95" />
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Knowledge Base</h1>
              <p className="text-white/80 mt-1">Manage documents and articles for AI responses</p>
            </div>
            <Button 
              onClick={handleCreateArticle} 
              variant="secondary" 
              className="hidden md:flex"
              data-testid="button-create-article"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "article" | "pdf")}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="article" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              PDF Processing
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab === 'pdf' ? 'documents' : 'articles'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-documents"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {KNOWLEDGE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(searchQuery || debouncedSearchQuery || (selectedCategory && selectedCategory !== 'all')) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="article" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load documents</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Retry
              </Button>
            </div>
          ) : documentsData?.articles?.length === 0 ? (
            <div className="text-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No articles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first knowledge article
              </p>
              <Button onClick={handleCreateArticle}>
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {documentsData?.totalArticles || 0} article{documentsData?.totalArticles !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {documentsData?.articles?.map((doc: KnowledgeDocument) => (
                  <div key={doc._id} className="h-full">
                    <KnowledgeBaseCard
                      document={doc}
                      onDelete={handleDeleteDocument}
                      onView={() => handleViewArticle(doc)}
                      onEdit={() => handleEditArticle(doc)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pdf" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">PDF Text Extraction</h3>
              <p className="text-muted-foreground">
                Upload PDF documents to extract text for immediate use in AI responses.
                <br />
                <strong>Note:</strong> PDFs are not stored permanently - they are processed for text extraction only.
              </p>
            </div>
            
            <PdfProcessor 
              onTextExtracted={handlePdfTextExtracted}
              className="border-border hover:border-primary/50 transition-colors"
            />
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload a PDF document using the dropzone above</li>
                <li>• Text is automatically extracted and displayed for review</li>
                <li>• The extracted text is immediately available for AI chat responses</li>
                <li>• PDFs are not saved to the database - only the text is used</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Floating Action Button for Mobile */}
      <Button
        onClick={handleCreateArticle}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        data-testid="fab-create-article"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* Article Form Modal */}
      <ArticleForm
        isOpen={isArticleFormOpen}
        onClose={handleCloseArticleForm}
        article={editingArticle || undefined}
        mode={editingArticle ? 'edit' : 'create'}
      />
      
      {/* Article View Modal */}
      {viewingArticle && (
        <ArticleViewModal
          isOpen={isArticleViewOpen}
          onClose={handleCloseArticleView}
          article={viewingArticle}
          onEdit={handleEditFromView}
        />
      )}
    </div>
  );
}
