import React, { useEffect, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

export default function TypingMarkdown({
  text,
  speed = 30,
  invert = false,
  onDone,
}: {
  text: string;
  speed?: number; // ms per token
  invert?: boolean;
  onDone?: () => void;
}) {
  const [tokens, setTokens] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Split by spaces while keeping them as separate tokens
    const tks = text.split(/(\s+)/).filter((t) => t.length > 0);
    setTokens(tks);
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (!tokens.length) return;
    if (index >= tokens.length) { onDone?.(); return; }

    const id = window.setTimeout(() => setIndex((i) => i + 1), speed);
    return () => window.clearTimeout(id);
  }, [tokens, index, speed, onDone]);

  const partial = tokens.slice(0, index).join("");
  return <MarkdownRenderer text={partial} invert={invert} />;
}
