/**
 * @fileoverview Script para consolidar archivos MDX de guía de usuario en un único Markdown
 * @description Procesa archivos MDX, limpia componentes específicos de Fumadocs y genera
 * un documento Markdown consolidado listo para impresión/PDF
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DOCS_DIR = join(
  import.meta.dirname,
  "..",
  "content",
  "docs",
  "guia-usuario",
);
const OUTPUT_DIR = join(import.meta.dirname, "..", "public");
const OUTPUT_FILE = join(OUTPUT_DIR, "manual-usuario.md");

const SECTION_ORDER = [
  "index.mdx",
  "instalacion.mdx",
  "primeros-pasos.mdx",
  "pedidos.mdx",
  "productos.mdx",
  "clientes.mdx",
  "pagos.mdx",
  "facturacion.mdx",
  "impresora.mdx",
  "temas.mdx",
];

const SECTION_TITLES: Record<string, string> = {
  "index.mdx": "Introducción",
  "instalacion.mdx": "Instalación",
  "primeros-pasos.mdx": "Primeros Pasos",
  "pedidos.mdx": "Gestión de Pedidos",
  "productos.mdx": "Gestión de Productos",
  "clientes.mdx": "Gestión de Clientes",
  "pagos.mdx": "Procesamiento de Pagos",
  "facturacion.mdx": "Facturación VERI*FACTU",
  "impresora.mdx": "Configuración de Impresora",
  "temas.mdx": "Temas y Personalización",
};

interface FrontMatter {
  title: string;
  description: string;
}

function extractFrontMatter(content: string): {
  frontMatter: FrontMatter;
  body: string;
} {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    return {
      frontMatter: { title: "", description: "" },
      body: content,
    };
  }

  const frontMatterStr = frontMatterMatch[1];
  const body = content.slice(frontMatterMatch[0].length).trim();

  const titleMatch = frontMatterStr.match(/title:\s*['"]?([^'"\n]+)['"]?/);
  const descMatch = frontMatterStr.match(/description:\s*['"]?([^'"\n]+)['"]?/);

  return {
    frontMatter: {
      title: titleMatch?.[1] ?? "",
      description: descMatch?.[1] ?? "",
    },
    body,
  };
}

function removeImports(content: string): string {
  return content.replace(/^import\s+.*?['"]\s*;?\s*$/gm, "");
}

function convertCallouts(content: string): string {
  return content.replace(
    /<Callout\s+type="(\w+)">([\s\S]*?)<\/Callout>/g,
    (_match, type, innerContent) => {
      const emoji =
        {
          info: "ℹ️",
          tip: "💡",
          warning: "⚠️",
          error: "❌",
          success: "✅",
        }[type as string] ?? "ℹ️";

      const cleanContent = innerContent.trim().replace(/\n\s*/g, "\n> ");
      return `> ${emoji} **${type.charAt(0).toUpperCase() + type.slice(1)}**\n> \n> ${cleanContent}`;
    },
  );
}

function convertSteps(content: string): string {
  let stepCounter = 0;
  return content.replace(
    /<Steps>([\s\S]*?)<\/Steps>/g,
    (_match, innerContent) => {
      stepCounter = 0;
      const processed = innerContent.replace(
        /^###\s+(.+)$/gm,
        (_m: string, stepTitle: string) => {
          stepCounter++;
          return `**Paso ${stepCounter}: ${stepTitle.trim()}**`;
        },
      );
      return processed.trim();
    },
  );
}

function convertTabs(content: string): string {
  let result = content;

  result = result.replace(/<Tabs\s+items=\{(\[.*?\])\}>/g, () => {
    return "";
  });

  result = result.replace(/<\/Tabs>/g, "");

  result = result.replace(/<Tab\s+value="([^"]+)">/g, (_match, tabValue) => {
    return `\n#### ${tabValue}\n`;
  });

  result = result.replace(/<\/Tab>/g, "");

  return result;
}

function convertCards(content: string): string {
  let result = content;

  result = result.replace(/<Cards>/g, "");
  result = result.replace(/<\/Cards>/g, "");

  result = result.replace(
    /<Card\s+title="([^"]+)"\s+href="([^"]+)">([\s\S]*?)<\/Card>/g,
    (_match, title, _href, description) => {
      return `- **${title}**: ${description.trim()}`;
    },
  );

  return result;
}

function cleanMdxContent(
  content: string,
  sectionNumber: number,
  fileName: string,
): string {
  let result = content;

  result = removeImports(result);

  result = convertCallouts(result);
  result = convertSteps(result);
  result = convertTabs(result);
  result = convertCards(result);

  result = result.replace(/<[A-Z][a-zA-Z]*\s*[^>]*\/>/g, "");
  result = result.replace(
    /<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g,
    "",
  );

  if (fileName !== "index.mdx") {
    result = result.replace(/^#\s+.+$/m, "");
  }

  let subSectionCounter = 0;
  result = result.replace(/^##\s+(.+)$/gm, (_match, title) => {
    subSectionCounter++;
    return `### ${sectionNumber}.${subSectionCounter} ${title}`;
  });

  result = result.replace(/^###\s+(?!\d)(.+)$/gm, "#### $1");
  result = result.replace(/^####\s+(?!\d)(.+)$/gm, "##### $1");

  result = result.replace(
    /\[([^\]]+)\]\(\/docs\/([^)]+)\)/g,
    (_match, text, path) => {
      const sectionName = path.split("/").pop()?.replace(/-/g, " ") ?? path;
      return `**${text}** (ver sección ${sectionName})`;
    },
  );

  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

function generateToc(sections: { title: string; number: number }[]): string {
  let toc = "## Tabla de Contenidos\n\n";

  for (const section of sections) {
    const anchor = section.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    toc += `${section.number}. [${section.title}](#${section.number}-${anchor})\n`;
  }

  return toc;
}

async function main(): Promise<void> {
  console.log("🔄 Generando manual de usuario...\n");

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const files = await readdir(DOCS_DIR);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));
  console.log(`📁 Encontrados ${mdxFiles.length} archivos MDX`);

  const orderedFiles = SECTION_ORDER.filter((f) => mdxFiles.includes(f));
  console.log(`📋 Procesando ${orderedFiles.length} secciones en orden\n`);

  const sections: { title: string; content: string; number: number }[] = [];

  for (let i = 0; i < orderedFiles.length; i++) {
    const fileName = orderedFiles[i];
    const filePath = join(DOCS_DIR, fileName);
    const rawContent = await readFile(filePath, "utf-8");

    const { frontMatter, body } = extractFrontMatter(rawContent);
    const sectionNumber = i + 1;
    const sectionTitle = SECTION_TITLES[fileName] ?? frontMatter.title;

    console.log(`  ${sectionNumber}. ${sectionTitle} (${fileName})`);

    const cleanedContent = cleanMdxContent(body, sectionNumber, fileName);

    sections.push({
      title: sectionTitle,
      content: cleanedContent,
      number: sectionNumber,
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const version = "1.0.0";

  let manual = `---
title: Manual de Usuario - TPV El Haido
version: ${version}
generated: ${today}
---

# Manual de Usuario

**TPV El Haido** - Sistema de Punto de Venta para Hostelería

Versión: ${version}
Fecha de generación: ${today}

---

`;

  const tocSections = sections.map((s) => ({
    title: s.title,
    number: s.number,
  }));
  manual += generateToc(tocSections);

  manual += "\n---\n\n";

  for (const section of sections) {
    const anchor = section.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    manual += `## ${section.number}. ${section.title} {#${section.number}-${anchor}}\n\n`;
    manual += section.content;
    manual += "\n\n---\n\n";
  }

  manual += `
---

**Fin del Manual de Usuario**

Para más información, visita la documentación online en [https://docs.elhaido.es](https://docs.elhaido.es)

© ${new Date().getFullYear()} TPV El Haido. Todos los derechos reservados.
`;

  await writeFile(OUTPUT_FILE, manual, "utf-8");

  console.log(`\n✅ Manual generado exitosamente: ${OUTPUT_FILE}`);
  console.log(`📄 Tamaño: ${(manual.length / 1024).toFixed(1)} KB`);
  console.log(`📑 Secciones: ${sections.length}`);
}

main().catch((error) => {
  console.error("❌ Error generando manual:", error);
  process.exit(1);
});
