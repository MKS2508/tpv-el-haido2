/**
 * @fileoverview Página de impresión del manual de usuario
 * @description Renderiza el manual completo en una sola vista optimizada para PDF
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

async function getManualContent(): Promise<string | null> {
  const manualPath = join(process.cwd(), "public", "manual-usuario.md");

  if (!existsSync(manualPath)) {
    return null;
  }

  return readFile(manualPath, "utf-8");
}

function parseMarkdown(content: string): ReactNode[] {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let currentIndex = 0;
  let inCodeBlock = false;
  let codeBlockContent = "";
  let codeBlockLang = "";
  let inTable = false;
  let tableRows: string[][] = [];
  let inBlockquote = false;
  let blockquoteContent: string[] = [];

  const processInlineMarkdown = (text: string): ReactNode => {
    const parts: ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      const matches = [
        boldMatch
          ? { type: "bold", match: boldMatch, index: boldMatch.index ?? 0 }
          : null,
        linkMatch
          ? { type: "link", match: linkMatch, index: linkMatch.index ?? 0 }
          : null,
        codeMatch
          ? { type: "code", match: codeMatch, index: codeMatch.index ?? 0 }
          : null,
      ]
        .filter(Boolean)
        .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const firstMatch = matches[0];
      if (!firstMatch) {
        parts.push(remaining);
        break;
      }

      const { type, match, index } = firstMatch;

      if (index > 0) {
        parts.push(remaining.slice(0, index));
      }

      const matchLength = match?.[0]?.length ?? 0;

      if (type === "bold") {
        parts.push(<strong key={`bold-${keyIndex++}`}>{match?.[1]}</strong>);
        remaining = remaining.slice(index + matchLength);
      } else if (type === "link") {
        parts.push(
          <a
            key={`link-${keyIndex++}`}
            href={match?.[2]}
            className="manual-link"
          >
            {match?.[1]}
          </a>,
        );
        remaining = remaining.slice(index + matchLength);
      } else if (type === "code") {
        parts.push(
          <code key={`code-${keyIndex++}`} className="manual-inline-code">
            {match?.[1]}
          </code>,
        );
        remaining = remaining.slice(index + matchLength);
      }
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  const flushBlockquote = () => {
    if (blockquoteContent.length > 0) {
      elements.push(
        <blockquote
          key={`blockquote-${currentIndex++}`}
          className="manual-callout"
        >
          {blockquoteContent.map((line, i) => (
            <p key={i}>{processInlineMarkdown(line)}</p>
          ))}
        </blockquote>,
      );
      blockquoteContent = [];
    }
    inBlockquote = false;
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const hasHeader =
        tableRows.length > 1 &&
        tableRows[1]?.every((cell) => /^-+$/.test(cell.trim()));
      const headerRow = hasHeader ? tableRows[0] : null;
      const bodyRows = hasHeader ? tableRows.slice(2) : tableRows;

      elements.push(
        <table key={`table-${currentIndex++}`} className="manual-table">
          {headerRow && (
            <thead>
              <tr>
                {headerRow.map((cell, i) => (
                  <th key={i}>{processInlineMarkdown(cell.trim())}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{processInlineMarkdown(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      tableRows = [];
    }
    inTable = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${currentIndex++}`} className="manual-code-block">
            <code className={codeBlockLang ? `language-${codeBlockLang}` : ""}>
              {codeBlockContent.trim()}
            </code>
          </pre>,
        );
        inCodeBlock = false;
        codeBlockContent = "";
        codeBlockLang = "";
      } else {
        flushBlockquote();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += `${line}\n`;
      continue;
    }

    if (line.startsWith("|")) {
      flushBlockquote();
      if (!inTable) {
        inTable = true;
      }
      const cells = line.split("|").slice(1, -1);
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith(">")) {
      if (!inBlockquote) {
        flushTable();
        inBlockquote = true;
      }
      blockquoteContent.push(line.slice(1).trim());
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    if (line.startsWith("---")) {
      flushBlockquote();
      flushTable();
      elements.push(
        <hr key={`hr-${currentIndex++}`} className="manual-divider" />,
      );
      continue;
    }

    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <h1 key={`h1-${currentIndex++}`} className="manual-h1">
          {processInlineMarkdown(h1Match[1])}
        </h1>,
      );
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <h2 key={`h2-${currentIndex++}`} className="manual-h2 print-section">
          {processInlineMarkdown(h2Match[1])}
        </h2>,
      );
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <h3 key={`h3-${currentIndex++}`} className="manual-h3">
          {processInlineMarkdown(h3Match[1])}
        </h3>,
      );
      continue;
    }

    const h4Match = line.match(/^####\s+(.+)$/);
    if (h4Match) {
      elements.push(
        <h4 key={`h4-${currentIndex++}`} className="manual-h4">
          {processInlineMarkdown(h4Match[1])}
        </h4>,
      );
      continue;
    }

    const h5Match = line.match(/^#####\s+(.+)$/);
    if (h5Match) {
      elements.push(
        <h5 key={`h5-${currentIndex++}`} className="manual-h5">
          {processInlineMarkdown(h5Match[1])}
        </h5>,
      );
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      elements.push(
        <li key={`li-${currentIndex++}`} className="manual-list-item">
          {processInlineMarkdown(ulMatch[1])}
        </li>,
      );
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      elements.push(
        <li
          key={`li-${currentIndex++}`}
          className="manual-list-item manual-ordered"
        >
          {processInlineMarkdown(olMatch[1])}
        </li>,
      );
      continue;
    }

    const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      const checked = checkboxMatch[1] === "x";
      elements.push(
        <li key={`cb-${currentIndex++}`} className="manual-checkbox">
          <input type="checkbox" checked={checked} readOnly />
          <span>{processInlineMarkdown(checkboxMatch[2])}</span>
        </li>,
      );
      continue;
    }

    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      elements.push(
        <figure key={`img-${currentIndex++}`} className="manual-figure">
          {/* biome-ignore lint/performance/noImgElement: Native img required for PDF generation */}
          <img src={imgMatch[2]} alt={imgMatch[1]} className="manual-image" />
          {imgMatch[1] && <figcaption>{imgMatch[1]}</figcaption>}
        </figure>,
      );
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    elements.push(
      <p key={`p-${currentIndex++}`} className="manual-paragraph">
        {processInlineMarkdown(line)}
      </p>,
    );
  }

  flushBlockquote();
  flushTable();

  return elements;
}

export default async function ManualPrintPage(): Promise<ReactNode> {
  const content = await getManualContent();

  if (!content) {
    return (
      <div className="manual-error">
        <h1>Manual no encontrado</h1>
        <p>El archivo manual-usuario.md no existe.</p>
        <p>
          Ejecuta primero: <code>bun run manual:md</code>
        </p>
      </div>
    );
  }

  const elements = parseMarkdown(content);

  return (
    <div className="manual-content">
      <style>{`
        :root {
          --manual-bg: #ffffff;
          --manual-text: #1a1a1a;
          --manual-heading: #0f172a;
          --manual-link: #2563eb;
          --manual-code-bg: #f1f5f9;
          --manual-border: #e2e8f0;
          --manual-callout-bg: #f8fafc;
          --manual-callout-border: #3b82f6;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: var(--manual-text);
          background: var(--manual-bg);
        }

        .manual-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .manual-h1 {
          font-size: 28pt;
          font-weight: 700;
          color: var(--manual-heading);
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .manual-h2 {
          font-size: 18pt;
          font-weight: 600;
          color: var(--manual-heading);
          margin-top: 32px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--manual-border);
        }

        .manual-h3 {
          font-size: 14pt;
          font-weight: 600;
          color: var(--manual-heading);
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .manual-h4 {
          font-size: 12pt;
          font-weight: 600;
          color: var(--manual-heading);
          margin-top: 20px;
          margin-bottom: 8px;
        }

        .manual-h5 {
          font-size: 11pt;
          font-weight: 600;
          color: var(--manual-heading);
          margin-top: 16px;
          margin-bottom: 8px;
        }

        .manual-paragraph {
          margin-bottom: 12px;
        }

        .manual-link {
          color: var(--manual-link);
          text-decoration: none;
        }

        .manual-link:hover {
          text-decoration: underline;
        }

        .manual-inline-code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.9em;
          background: var(--manual-code-bg);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .manual-code-block {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9pt;
          background: var(--manual-code-bg);
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
          border: 1px solid var(--manual-border);
        }

        .manual-code-block code {
          font-family: inherit;
        }

        .manual-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 10pt;
        }

        .manual-table th,
        .manual-table td {
          border: 1px solid var(--manual-border);
          padding: 8px 12px;
          text-align: left;
        }

        .manual-table th {
          background: var(--manual-code-bg);
          font-weight: 600;
        }

        .manual-table tr:nth-child(even) td {
          background: var(--manual-callout-bg);
        }

        .manual-callout {
          background: var(--manual-callout-bg);
          border-left: 4px solid var(--manual-callout-border);
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 0 8px 8px 0;
        }

        .manual-callout p {
          margin-bottom: 8px;
        }

        .manual-callout p:last-child {
          margin-bottom: 0;
        }

        .manual-divider {
          border: none;
          border-top: 1px solid var(--manual-border);
          margin: 32px 0;
        }

        .manual-list-item {
          margin-left: 24px;
          margin-bottom: 4px;
        }

        .manual-checkbox {
          list-style: none;
          margin-left: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .manual-checkbox input {
          width: 16px;
          height: 16px;
        }

        .manual-figure {
          margin: 16px 0;
          text-align: center;
        }

        .manual-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid var(--manual-border);
        }

        .manual-figure figcaption {
          font-size: 10pt;
          color: #64748b;
          margin-top: 8px;
          font-style: italic;
        }

        .manual-error {
          padding: 40px;
          text-align: center;
        }

        .manual-error h1 {
          color: #dc2626;
          margin-bottom: 16px;
        }

        .manual-error code {
          background: var(--manual-code-bg);
          padding: 4px 8px;
          border-radius: 4px;
        }

        /* Print styles */
        @media print {
          body {
            font-size: 10pt;
          }

          .manual-content {
            max-width: none;
            padding: 0;
          }

          .print-section {
            page-break-before: always;
          }

          .print-section:first-of-type {
            page-break-before: avoid;
          }

          .manual-code-block,
          .manual-table,
          .manual-figure {
            page-break-inside: avoid;
          }

          .manual-callout {
            page-break-inside: avoid;
          }

          a[href]::after {
            content: " (" attr(href) ")";
            font-size: 0.8em;
            color: #666;
          }

          a[href^="#"]::after,
          a[href^="javascript"]::after {
            content: "";
          }
        }
      `}</style>

      {elements}
    </div>
  );
}
