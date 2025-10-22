import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, X, Loader2, Copy, Check } from 'lucide-react';

interface PdfProcessorProps {
  onTextExtracted?: (text: string) => void;
  className?: string;
}

interface ExtractedResult {
  fileName: string;
  fileSize: number;
  extractedText: string;
}

export function PdfProcessor({ onTextExtracted, className }: PdfProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
        setSelectedFile(acceptedFiles[0]);
        setExtractedResult(null);
      }
    },
  });

  const handleExtractText = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/knowledge-base/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text');
      }

      const result = await response.json();
      setExtractedResult(result);
      onTextExtracted?.(result.extractedText);
    } catch (error: any) {
      setError(error.message || 'Failed to extract text from PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (extractedResult?.extractedText) {
      await navigator.clipboard.writeText(extractedResult.extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedResult(null);
    setError('');
    setCopied(false);
  };

  // Show extracted text result
  if (extractedResult) {
    return (
      <Card className={`border-2 ${className}`}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Text Extracted Successfully</h3>
            <Button variant="outline" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
          
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <FileText className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{extractedResult.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(extractedResult.fileSize / 1024)} KB • Text extracted
              </p>
            </div>
          </div>

          {/* Extracted text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Extracted Text</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyText}
                className="text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={extractedResult.extractedText}
              readOnly
              rows={12}
              className="font-mono text-xs resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {extractedResult.extractedText.length} characters extracted. 
              This text is now available for AI responses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show file selection for processing
  if (selectedFile) {
    return (
      <Card className={`border-2 ${className}`}>
        <CardContent className="p-6 space-y-4">
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
              onClick={() => setSelectedFile(null)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleExtractText} 
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Text...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Extract Text
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedFile(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show dropzone
  return (
    <Card className={`border-2 border-dashed ${className}`}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center py-12 cursor-pointer transition-colors rounded-lg
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
                {isDragActive ? 'Drop PDF here' : 'Upload PDF for Text Extraction'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isDragActive 
                  ? 'Release to process your PDF file'
                  : 'Drag and drop a PDF file here, or click to select'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB • Text only, no storage
              </p>
            </div>
            
            {!isDragActive && (
              <Button variant="outline" type="button">
                <Upload className="h-4 w-4 mr-2" />
                Choose PDF File
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