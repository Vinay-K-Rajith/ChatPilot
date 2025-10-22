import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Loader2 
} from "lucide-react";
import { useImportLeads } from "@/hooks/useLeads";
import type { ImportResponse } from "../../../shared/models/lead";

interface ExcelImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: ImportResponse) => void;
}

export default function ExcelImport({ open, onClose, onSuccess }: ExcelImportProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importLeads = useImportLeads();

  const acceptedFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    '.xlsx',
    '.xls'
  ];

  const handleFileSelect = (file: File) => {
    if (!acceptedFileTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type)
    )) {
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importLeads.mutateAsync(selectedFile);
      setImportResult(result);
      onSuccess?.(result);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setIsDragOver(false);
    onClose();
  };

  const downloadSample = () => {
    const sampleData = [
      ['name', 'phone', 'email', 'status', 'engagementScore'],
      ['John Doe', '+1234567890', 'john@example.com', 'new', '75'],
      ['Jane Smith', '+1987654321', 'jane@example.com', 'contacted', '60'],
      ['Mike Johnson', '+1555123456', 'mike@example.com', 'qualified', '90']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx or .xls) to import leads into your system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult && (
            <>
              {/* File Drop Zone */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
                  ${selectedFile ? 'bg-muted/50' : ''}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">
                        Drop your Excel file here, or{" "}
                        <button
                          type="button"
                          className="text-primary underline hover:no-underline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Supports .xlsx and .xls files up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Sample Template */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Need a template?</h4>
                    <p className="text-xs text-muted-foreground">
                      Download a sample CSV with the correct format
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSample}
                    data-testid="download-sample"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample
                  </Button>
                </div>
              </div>

              {/* Required Columns Info */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your Excel file should have the following columns: <strong>name</strong>, <strong>phone</strong> (required), 
                  <strong>email</strong>, <strong>status</strong>, <strong>engagementScore</strong>
                </AlertDescription>
              </Alert>

              {importLeads.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{importLeads.error.message}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Import Progress */}
          {importLeads.isPending && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Importing leads...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">{importResult.success}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">Successfully Imported</p>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">{importResult.failed}</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">Failed</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="font-medium">{(importResult.success + importResult.failed)}</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Total Processed</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Import Errors ({importResult.errors.length})
                  </h4>
                  <ScrollArea className="h-32 w-full rounded-md border">
                    <div className="p-4 space-y-2">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Row {error.row}
                            </Badge>
                            <span className="text-red-600">{error.errors.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importLeads.isPending}
              data-testid="import-leads-button"
            >
              {importLeads.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Leads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}