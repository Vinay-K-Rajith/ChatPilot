import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface KnowledgeDocument {
  id: string;
  title: string;
  category?: string;
  fileName: string;
  uploadedAt: Date;
  content: string;
}

interface KnowledgeBaseCardProps {
  document: KnowledgeDocument;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export default function KnowledgeBaseCard({ document, onDelete, onDownload }: KnowledgeBaseCardProps) {
  return (
    <Card className="hover-elevate transition-all" data-testid={`knowledge-card-${document.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">{document.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{document.fileName}</p>
          </div>
        </div>
        {document.category && (
          <Badge variant="secondary" className="shrink-0">
            {document.category}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{document.content}</p>
        
        <div className="flex items-center justify-between pt-2 border-t border-card-border">
          <span className="text-xs text-muted-foreground">
            Uploaded {format(document.uploadedAt, "MMM d, yyyy")}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDownload?.(document.id)}
              data-testid={`button-download-${document.id}`}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(document.id)}
              data-testid={`button-delete-${document.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
