import React, { useMemo } from "react";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toHtml(md: string): string {
  // Normalize line endings
  md = md.replace(/\r\n?/g, "\n");

  // Code inline
  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  md = md.replace(/\*(?!\*)([^*]+)\*/g, '<em>$1</em>');

  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (/^#\s+/.test(line)) { out.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`); i++; continue; }
    if (/^##\s+/.test(line)) { out.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ''))}</h2>`); i++; continue; }
    if (/^###\s+/.test(line)) { out.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ''))}</h3>`); i++; continue; }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(`<li>${item}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(`<li>${item}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line -> paragraph separator
    if (!line.trim()) { out.push(''); i++; continue; }

    // Paragraph (accumulate until blank line)
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim()) { para.push(lines[i]); i++; }
    out.push(`<p>${para.map(escapeHtml).join('<br/>')}</p>`);
  }

  return out.filter(Boolean).join('\n');
}

export default function MarkdownRenderer({ text, invert = false }: { text: string; invert?: boolean }) {
  const html = useMemo(() => toHtml(text), [text]);
  return (
    <article
      className={
        `prose prose-sm md:prose-base max-w-none ${invert ? 'prose-invert' : ''} ` +
        // tighten spacing for chat context
        'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 ' +
        'prose-headings:my-1 prose-headings:leading-tight ' +
        'prose-pre:my-2 prose-table:my-2 prose-blockquote:my-2 ' +
        'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted'
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
