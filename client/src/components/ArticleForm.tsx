import React, { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { CreateLegacyArticleSchema, UpdateLegacyArticleSchema, KNOWLEDGE_CATEGORIES } from '../../../shared/knowledge';
import { useCreateArticle, useUpdateKnowledgeDocument, useDeleteKnowledgeDocument } from '@/hooks/useKnowledgeBase';
import type { LegacyArticle, CreateLegacyArticleData, UpdateLegacyArticleData } from '../../../shared/knowledge';

interface ArticleFormProps {
  isOpen: boolean;
  onClose: () => void;
  article?: LegacyArticle;
  mode: 'create' | 'edit';
}

export function ArticleForm({ isOpen, onClose, article, mode }: ArticleFormProps) {
  const isEditMode = mode === 'edit' && article;
  
  const createArticle = useCreateArticle();
  const updateKnowledgeDocument = useUpdateKnowledgeDocument();
  const deleteDocument = useDeleteKnowledgeDocument();
  
  const schema = isEditMode ? UpdateLegacyArticleSchema : CreateLegacyArticleSchema;
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
    }
  });

  // Reset form when article changes or dialog opens
  useEffect(() => {
    if (isEditMode && article) {
      reset({
        title: article.title || '',
        content: article.content || '',
        category: article.category || '',
      });
    } else {
      reset({
        title: '',
        content: '',
        category: '',
      });
    }
  }, [article, isEditMode, reset, isOpen]);

  const categoryValue = watch('category');

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  }, [handleSubmit]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const onSubmit = async (data: any) => {
    try {
      if (isEditMode && article) {
        await updateKnowledgeDocument.mutateAsync({
          id: article._id,
          data: {
            title: data.title,
            content: data.content,
            category: data.category === 'none' ? undefined : data.category,
          }
        });
      } else {
        await createArticle.mutateAsync({
          title: data.title,
          content: data.content,
          category: data.category === 'none' ? undefined : data.category,
        });
      }
      
      handleClose();
    } catch (error: any) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} article: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !article) return;
    
    if (window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      try {
        await deleteDocument.mutateAsync(article._id);
        handleClose();
      } catch (error: any) {
        alert(`Failed to delete article: ${error.message}`);
      }
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[95vh] w-[95vw] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditMode ? 'Edit Article' : 'Create New Article'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? 'Modify the article details below' : 'Create a new knowledge article'}
            <span className="ml-2 text-xs">(Ctrl/⌘ + S to save)</span>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-1 pb-4 max-h-[calc(95vh-200px)]">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title *
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter article title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Display title for the article
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select 
                value={categoryValue || 'none'} 
                onValueChange={(value) => setValue('category', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional classification
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Article Content *
              </Label>
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(value) => setValue('content', value)}
                placeholder="Write your article content here..."
                error={!!errors.content}
                disabled={isSubmitting}
              />
              {errors.content && (
                <p className="text-xs text-red-500">{errors.content.message}</p>
              )}
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Rich text editor with Markdown support. Use Ctrl+S to save quickly.
                </p>
                <div className="text-xs text-muted-foreground">
                  {watch('content')?.length || 0} characters
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex items-center justify-between gap-3">
              {/* Delete button (edit mode only) */}
              {isEditMode && (
                <Button 
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting || deleteDocument.isPending}
                >
                  {deleteDocument.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              )}
              
              {/* Main actions */}
              <div className="flex gap-2 ml-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isSubmitting || createArticle.isPending || updateKnowledgeDocument.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || createArticle.isPending || updateKnowledgeDocument.isPending}
                >
                  {(isSubmitting || createArticle.isPending || updateKnowledgeDocument.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? 'Update Article' : 'Create Article'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}