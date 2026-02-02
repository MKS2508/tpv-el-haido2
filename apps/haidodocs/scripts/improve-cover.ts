#!/usr/bin/env bun
/**
 * Improve the cover page of manual-usuario.html
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '../public/manual-usuario.html');
const OUTPUT_PATH = path.join(__dirname, '../public/manual-usuario.html');

console.log('Reading HTML file...');
const html = fs.readFileSync(HTML_PATH, 'utf-8');

// Find the write div content - using regex to handle quote variations
const writeMatch = html.match(/<div id=['"]write['"][^>]*>/);
if (!writeMatch) {
  console.error('Could not find #write div');
  process.exit(1);
}

const writeStart = html.indexOf(writeMatch[0]);
const writeStartEnd = writeStart + writeMatch[0].length;

// Find the end of the write div (the first </div> closes the write div)
const writeDivEnd = html.indexOf('</div></div>', writeStartEnd);
if (writeDivEnd === -1) {
  console.error('Could not find end of #write div');
  process.exit(1);
}

const beforeWrite = html.slice(0, writeStart);
const afterWriteDivClose = html.slice(writeDivEnd + 6); // Skip </div> of write div

// Get the content inside the write div (everything from after the opening tag to before the closing)
let content = html.slice(writeStartEnd, writeDivEnd);

// Extract the original content after the cover (find Tabla de Contenidos)
const tocIndex = content.indexOf('<h2 id=\'tabla-de-contenidos\'>');
if (tocIndex === -1) {
  console.error('Could not find table of contents');
  process.exit(1);
}

const beforeToc = content.slice(0, tocIndex);
const afterToc = content.slice(tocIndex);

// New improved cover page
const newCover = `<style>
/* Cover page styles */
#tpv-el-haido {
  text-align: center;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0ea5e9 100%);
  color: white;
  border-radius: 0 0 24px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(37, 99, 235, 0.3);
  margin-top: -36px;
  margin-left: -36px;
  margin-right: -36px;
  padding-top: 72px;
}

#tpv-el-haido::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: rotate 30s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

#tpv-el-haido > span {
  font-family: 'Georgia', 'Times New Roman', serif;
  display: block;
}

#tpv-el-haido > span:first-child {
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 0.5rem;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

#manual-de-usuario-oficial {
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 2rem;
  opacity: 0.95;
  letter-spacing: 2px;
  text-transform: uppercase;
}

#tpv-el-haido + p > strong {
  display: inline-block;
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

#tpv-el-haido + p + p > strong,
#tpv-el-haido + p + p + p > strong {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

#tpv-el-haido + p + hr {
  border: none;
  margin: 0;
}

#tpv-el-haido + p + p + hr {
  border: none;
  height: 1px;
  background: rgba(255,255,255,0.3);
  margin: 2rem 0;
}

#tpv-el-haido + p + img {
  max-width: 300px;
  height: auto;
  margin: 2rem auto;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  border: 4px solid rgba(255,255,255,0.2);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

#tpv-el-haido + p + p + em {
  display: block;
  text-align: center;
  color: rgba(255,255,255,0.7);
  font-style: italic;
  font-size: 0.9rem;
  margin-top: 1rem;
}

/* Print styles for cover */
@media print {
  #tpv-el-haido {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0ea5e9 100%) !important;
  }

  #tpv-el-haido::before {
    display: none;
  }

  #tpv-el-haido + p + img {
    animation: none;
  }
}
</style>

<h1 id='tpv-el-haido'><span>TPV El Haido</span></h1>
<h2 id='manual-de-usuario-oficial'><span>Manual de Usuario Oficial</span></h2>
<p><strong><span>Sistema de Punto de Venta para Hostelería</span></strong></p>
<hr />
<h3 id='gestión-de-pedidos--facturación-electrónica--impresión-térmica'><span>Gestión de pedidos · Facturación electrónica · Impresión térmica</span></h3>
<p><strong><span>Versión 1.0.0</span></strong><span> | </span><strong><span>Febrero 2026</span></strong></p>
<p><img src="screenshots/PORTADA.png" alt="Portada de TPV El Haido con logo del sistema"></p>
<p><em><span>Imagen de portada: TPV El Haido - Sistema de Punto de Venta</span></em></p>
<hr />
<hr />
`;

// Combine new cover with rest of content
const newContent = newCover + afterToc;

// Reconstruct the full HTML
// The write div opening tag + new content + closing </div> for write div + rest of file
const writeDivOpen = writeMatch[0];
const newHtml = beforeWrite + writeDivOpen + newContent + '</div>' + afterWriteDivClose;

// Write back to the original file
fs.writeFileSync(OUTPUT_PATH, newHtml, 'utf-8');

console.log('✅ Cover page improved!');
console.log('');
console.log('Changes:');
console.log('  • Gradient background (blue/cyan)');
console.log('  • Animated decorative effect');
console.log('  • Larger, more prominent title');
console.log('  • Floating image with shadow');
console.log('  • Better spacing and typography');
console.log('');
console.log('To view in browser:');
console.log('  Open:', OUTPUT_PATH);
