import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { KnowledgeDocument } from '../../../shared/knowledge';

interface ArticleViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: KnowledgeDocument;
  onEdit?: () => void;
}

export function ArticleViewModal({ isOpen, onClose, article, onEdit }: ArticleViewModalProps) {
  const handleEdit = () => {
    onEdit?.();
    onClose();
  };

  // Render content with basic HTML support
  const renderContent = (content: string) => {
    // Simple HTML rendering - you could use a more sophisticated markdown/HTML renderer
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none prose-headings:mb-3 prose-headings:mt-6 prose-p:mb-4 prose-ul:mb-4 prose-ol:mb-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] w-[95vw] flex flex-col">
        <DialogHeader className="flex-shrink-0 space-y-3 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold leading-tight mb-2">
                {article.title || 'Untitled Article'}
              </DialogTitle>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {article.uploadedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(article.uploadedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}
              </div>
            </div>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
          
          <Separator />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {article.content ? (
              renderContent(article.content)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No content available for this article.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}