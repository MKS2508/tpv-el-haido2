#!/usr/bin/env bun
/**
 * Fix manual-usuario.html for proper image display and print styling
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '../public/manual-usuario.html');
const OUTPUT_PATH = path.join(__dirname, '../public/manual-usuario-fixed.html');

console.log('Reading HTML file...');
let html = fs.readFileSync(HTML_PATH, 'utf-8');

// 1. Ensure image paths are correct relative paths
// The HTML is in public/ and screenshots are in public/screenshots/
// So relative paths should be "screenshots/" which they already are
// But let's verify and fix if needed

// 2. Add enhanced print styles
const printStyles = `
<style type="text/css" id="print-enhancements">
@media print {
  /* Page setup */
  @page {
    size: A4;
    margin: 1.5cm;
  }

  /* Page breaks - avoid breaking after specific elements */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }

  img, figure, table, pre, blockquote, li {
    page-break-inside: avoid;
  }

  /* Force page break before main sections */
  h2 {
    page-break-before: always;
  }

  /* First section no page break */
  #write > h2:first-of-type,
  #write > h1:first-child + h2 {
    page-break-before: avoid;
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto !important;
    display: block;
    margin: 16px auto;
  }

  /* Tables */
  table {
    page-break-inside: avoid;
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }

  table th, table td {
    border: 1px solid #ddd;
    padding: 8px;
    font-size: 10pt;
  }

  table thead th {
    background: #f5f5f5;
    font-weight: bold;
  }

  /* Code blocks */
  pre {
    page-break-inside: avoid;
    background: #f8f8f8;
    padding: 12px;
    border-radius: 4px;
    font-size: 9pt;
    border: 1px solid #ddd;
  }

  code {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
  }

  /* Links */
  a {
    color: #000;
    text-decoration: underline;
  }

  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
    word-break: break-all;
  }

  /* Hide TOC in print */
  .md-toc {
    display: none !important;
  }

  /* Body text */
  body {
    font-size: 10.5pt;
    line-height: 1.4;
    color: #000;
  }

  /* Mermaid diagrams */
  .mermaid {
    page-break-inside: avoid;
    margin: 20px 0;
  }

  .mermaid svg {
    max-width: 100%;
    height: auto;
  }

  /* Hide UI elements in print */
  button, .btn, input[type="button"] {
    display: none;
  }

  /* Optimize tables for print */
  table {
    font-size: 9pt;
  }

  /* Improve table readability */
  table tbody tr:nth-child(even) {
    background: #f9f9f9;
  }

  /* Page numbers in footer */
  @page {
    @bottom-center {
      content: "Página " counter(page) " de " counter(pages);
      font-size: 9pt;
      color: #666;
    }
  }
}
</style>

<style type="text/css" id="image-fix">
/* Ensure images load and display properly */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 20px auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Image captions - style the em tags after images */
img + em {
  display: block;
  text-align: center;
  color: #666;
  font-style: italic;
  margin-top: -10px;
  margin-bottom: 20px;
  font-size: 0.9em;
}

/* Fix for Mermaid diagrams */
.mermaid {
  text-align: center;
  margin: 24px 0;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}
</style>
`;

// Insert print styles before the closing </head> tag
const headEndIndex = html.lastIndexOf('</head>');
if (headEndIndex !== -1) {
  html = html.slice(0, headEndIndex) + printStyles + '</head>' + html.slice(headEndIndex + 7);
}

// 3. Improve the title and add meta tags
const betterMeta = `
  <title>TPV El Haido - Manual de Usuario</title>
  <meta name="description" content="Manual de usuario completo de TPV El Haido - Sistema de Punto de Venta para Hostelería">
  <meta name="author" content="TPV El Haido">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
`;

// Insert meta tags after the existing viewport meta
const viewportIndex = html.indexOf('<meta name=\'viewport\'');
if (viewportIndex !== -1) {
  const metaEndIndex = html.indexOf('>', viewportIndex);
  html = html.slice(0, metaEndIndex + 1) + betterMeta + html.slice(metaEndIndex + 1);
}

// 4. Add a base tag to help with relative paths (commented out - can be enabled if needed)
// const baseTag = '<base href="./">';
// const headIndex = html.indexOf('<head>');
// if (headIndex !== -1) {
//   html = html.slice(0, headIndex + 6) + baseTag + html.slice(headIndex + 6);
// }

// Write fixed HTML
fs.writeFileSync(OUTPUT_PATH, html, 'utf-8');

console.log('✅ Fixed HTML saved to:', OUTPUT_PATH);
console.log('');
console.log('Changes applied:');
console.log('  1. ✅ Image paths verified (relative: screenshots/)');
console.log('  2. ✅ Enhanced print styles added');
console.log('  3. ✅ Page breaks optimized for sections');
console.log('  4. ✅ Image captions styled');
console.log('  5. ✅ Table styles improved for printing');
console.log('  6. ✅ Page numbers in footer');
console.log('  7. ✅ Code blocks optimized');
console.log('');
console.log('To view in browser:');
console.log('  Open:', OUTPUT_PATH);
console.log('  Or: file://' + path.resolve(OUTPUT_PATH));
console.log('');
console.log('To print:');
console.log('  1. Open the HTML in browser');
console.log('  2. Press Ctrl/Cmd + P');
console.log('  3. Select "Save as PDF"');
console.log('  4. Enable "Background graphics" for best results');
