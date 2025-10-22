import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useUploadPDF } from '@/hooks/useKnowledgeBase';
import { KNOWLEDGE_CATEGORIES } from '../../../shared/knowledge';

interface PdfDropzoneProps {
  onUploadComplete?: () => void;
  className?: string;
}

export function PdfDropzone({ onUploadComplete, className }: PdfDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  const uploadPDF = useUploadPDF();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      setError('');
      
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError('File size must be less than 10MB');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Only PDF files are allowed');
        } else {
          setError('Invalid file');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        // Auto-generate title from filename if not already set
        if (!title) {
          const filename = file.name.replace(/\.pdf$/i, '');
          const generatedTitle = filename
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          setTitle(generatedTitle);
        }
      }
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadPDF.mutateAsync({
        file: selectedFile,
        category: category && category !== 'none' ? category : undefined,
        title: title || undefined,
      });
      
      // Reset form
      setSelectedFile(null);
      setTitle('');
      setCategory('');
      setError('');
      
      onUploadComplete?.();
    } catch (error: any) {
      setError(error.message || 'Failed to upload PDF');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setTitle('');
    setCategory('');
    setError('');
  };

  if (selectedFile) {
    return (
      <Card className={`border-2 border-dashed ${className}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* File preview */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <FileText className="h-8 w-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(selectedFile.size / 1024)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={uploadPDF.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-generated from filename"
                  disabled={uploadPDF.isPending}
                />
              </div>

              <div>
                <Label htmlFor="category">Category (optional)</Label>
                <Select value={category} onValueChange={setCategory} disabled={uploadPDF.isPending}>
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
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleUpload} 
                disabled={uploadPDF.isPending}
                className="flex-1"
              >
                {uploadPDF.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={uploadPDF.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-dashed ${className}`}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center py-12 cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-colors
              ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              <Upload className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {isDragActive ? 'Drop PDF here' : 'Upload PDF Document'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isDragActive 
                  ? 'Release to upload your PDF file'
                  : 'Drag and drop a PDF file here, or click to select'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB
              </p>
            </div>
            
            {!isDragActive && (
              <Button variant="outline" type="button">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}