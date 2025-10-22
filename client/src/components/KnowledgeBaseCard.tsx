import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, NotebookPen, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import type { KnowledgeDocument } from '../../../shared/knowledge';

interface KnowledgeBaseCardProps {
  document: KnowledgeDocument;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onPreview?: (id: string) => void;
  onView?: () => void;
  onEdit?: () => void;
}

export default function KnowledgeBaseCard({ document, onDelete, onDownload, onPreview, onView, onEdit }: KnowledgeBaseCardProps) {
  const isPDF = document.type === 'pdf';
  const isArticle = document.type === 'article';
  
  // Get display content based on document type - increased length for better preview
  const displayContent = isPDF 
    ? (document.extractedText ? `${document.extractedText.slice(0, 280)}...` : 'PDF content processing...')
    : (document.content ? `${document.content.slice(0, 280)}...` : 'No content available');
    
  const fileName = isPDF ? document.fileName : undefined;
  const pageInfo = isPDF && document.pageCount ? `${document.pageCount} pages` : undefined;
  const fileSize = isPDF && document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : undefined;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    // Only make articles clickable to view
    if (isArticle && onView) {
      onView();
    }
  };

  return (
    <Card 
      className={`group transition-all duration-200 overflow-hidden h-full flex flex-col ${
        isArticle ? 'cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-lg' : ''
      }`} 
      data-testid={`knowledge-card-${document._id}`}
      onClick={handleCardClick}
    >
      <CardHeader className="flex-shrink-0 pb-3">
        {/* Header row with icon, title and badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
              isPDF ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
            }`}>
              {isPDF ? (
                <FileText className="h-5 w-5" />
              ) : (
                <NotebookPen className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold line-clamp-2 leading-tight mb-1">
                {document.title || 'Untitled'}
              </CardTitle>
            </div>
          </div>
          
          {/* Badges in a column stack */}
          <div className="flex flex-col gap-1 shrink-0">
            <Badge variant={isPDF ? "destructive" : "default"} className="text-xs">
              {isPDF ? "PDF" : "Article"}
            </Badge>
          </div>
        </div>
        
        {/* File info row (for PDFs) */}
        {fileName && (
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            <span className="truncate flex-1">{fileName}</span>
            <div className="flex gap-1 text-xs text-muted-foreground shrink-0">
              {pageInfo && <span>{pageInfo}</span>}
              {fileSize && pageInfo && <span>•</span>}
              {fileSize && <span>{fileSize}</span>}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Content preview - takes up available space */}
        <div className="flex-1 mb-4">
          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
            {displayContent}
          </p>
        </div>
        
        {/* Footer with date and actions */}
        <div className="flex items-center justify-between pt-3 border-t mt-auto">
          <span className="text-xs text-muted-foreground">
            {document.uploadedAt ? format(new Date(document.uploadedAt), "MMM d, yyyy") : 'Unknown date'}
          </span>
          
          {/* Action buttons - properly spaced */}
          <div className="flex items-center gap-1">
            {/* PDF-specific actions */}
            {isPDF && (
              <>
                {onPreview && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(document._id);
                    }}
                    title="Preview PDF"
                    data-testid={`button-preview-${document._id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(document._id);
                    }}
                    title="Download PDF"
                    data-testid={`button-download-${document._id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            
            {/* Article-specific actions */}
            {isArticle && (
              <>
                {onView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView();
                    }}
                    title="View Article"
                    data-testid={`button-view-${document._id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    title="Edit Article"
                    data-testid={`button-edit-${document._id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            
            {/* Delete action - always visible for both types */}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(document._id);
                }}
                title="Delete"
                data-testid={`button-delete-${document._id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Click hint for articles */}
      {isArticle && (
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md shadow-sm">
            Click to view
          </div>
        </div>
      )}
    </Card>
  );
}
