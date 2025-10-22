import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link,
  Eye,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export interface RichTextEditorRef {
  focus: () => void;
  insertText: (text: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value = '', onChange, placeholder, className, error, disabled }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isPreview, setIsPreview] = React.useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      insertText: (text: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue = value.slice(0, start) + text + value.slice(end);
          onChange?.(newValue);
          
          // Reset cursor position after text insertion
          setTimeout(() => {
            textarea.setSelectionRange(start + text.length, start + text.length);
            textarea.focus();
          }, 0);
        }
      }
    }));

    const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end) || placeholder;
      const replacement = `${before}${selectedText}${after}`;
      
      const newValue = value.slice(0, start) + replacement + value.slice(end);
      onChange?.(newValue);

      // Set cursor position
      setTimeout(() => {
        const newStart = selectedText === placeholder 
          ? start + before.length 
          : start + replacement.length;
        textarea.setSelectionRange(newStart, newStart);
        textarea.focus();
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Handle Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        insertMarkdown('  ');
        return;
      }

      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertMarkdown('**', '**', 'bold text');
            break;
          case 'i':
            e.preventDefault();
            insertMarkdown('*', '*', 'italic text');
            break;
          case 'k':
            e.preventDefault();
            insertMarkdown('[', '](url)', 'link text');
            break;
        }
      }
    };

    const renderPreview = () => {
      // Simple markdown-like preview (you could use a proper markdown parser here)
      let html = value
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground">$1</blockquote>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

      // Wrap lists
      html = html.replace(/(<li>.*<\/li>)/g, '<ul class="list-disc list-inside space-y-1">$1</ul>');
      
      // Wrap in paragraphs
      if (html && !html.includes('<p>')) {
        html = `<p>${html}</p>`;
      }

      return html;
    };

    if (isPreview) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(false)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <div 
            className={cn(
              "min-h-[400px] p-3 border rounded-md prose prose-sm max-w-none dark:prose-invert",
              "prose-headings:font-semibold prose-p:leading-relaxed",
              className
            )}
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('**', '**', 'bold text')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('*', '*', 'italic text')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('`', '`', 'code')}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('[', '](url)', 'link text')}
              title="Link (Ctrl+K)"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('> ', '', 'quote')}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('- ', '', 'list item')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('1. ', '', 'list item')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        {/* Text Area */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={20}
          disabled={disabled}
          className={cn(
            "resize-y min-h-[400px] font-mono text-sm leading-relaxed",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            error && "border-red-500",
            className
          )}
        />

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Markdown shortcuts: **bold**, *italic*, `code`, {`>`} quote, - list, [link](url)</p>
          <p>Keyboard: Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link), Tab (indent)</p>
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;