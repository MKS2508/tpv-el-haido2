'use client';

import { useEffect, useState } from 'react';

interface CodeLine {
  prompt?: string;
  arrow?: boolean;
  text: string;
}

interface TypewriterCodeProps {
  lines: CodeLine[];
  typingSpeed?: number;
  lineDelay?: number;
  showCursor?: boolean;
}

export function TypewriterCode({
  lines,
  typingSpeed = 30,
  lineDelay = 200,
  showCursor = true,
}: TypewriterCodeProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setIsTyping(false);
      return;
    }

    const currentLine = lines[currentLineIndex];
    const fullText = currentLine.text;

    if (currentCharIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          newLines[currentLineIndex] = fullText.slice(0, currentCharIndex + 1);
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentCharIndex(0);
      }, lineDelay);

      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, lines, typingSpeed, lineDelay]);

  return (
    <code className="block">
      {lines.map((line, index) => {
        const displayedText = displayedLines[index] || '';
        const isCurrentLine = index === currentLineIndex;
        const isVisible = index <= currentLineIndex;

        if (!isVisible) return null;

        return (
          <span key={index} className="block">
            {line.prompt && <span className="terminal-prompt">{line.prompt} </span>}
            {line.arrow && <span className="terminal-arrow">→ </span>}
            <span>{displayedText}</span>
            {showCursor && isCurrentLine && isTyping && (
              <span className="terminal-cursor animate-blink" />
            )}
          </span>
        );
      })}
      {showCursor && !isTyping && <span className="terminal-cursor animate-blink" />}
    </code>
  );
}

export function StaticTerminalCode({ lines }: { lines: CodeLine[] }) {
  return (
    <code className="block">
      {lines.map((line, index) => (
        <span key={index} className="block">
          {line.prompt && <span className="terminal-prompt">{line.prompt} </span>}
          {line.arrow && <span className="terminal-arrow">→ </span>}
          <span>{line.text}</span>
        </span>
      ))}
    </code>
  );
}
