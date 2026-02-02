/**
 * @fileoverview Script para generar PDF del manual de usuario usando Playwright
 * @description Levanta servidor de desarrollo, navega a /manual-print y genera PDF
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";

const PROJECT_DIR = join(import.meta.dirname, "..");
const OUTPUT_FILE = join(PROJECT_DIR, "public", "manual-usuario.pdf");
const DEV_PORT = 3000;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const MANUAL_URL = `${DEV_URL}/manual-print`;

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.stdout.write(".");
  }
  return false;
}

async function startDevServer(): Promise<ChildProcess | null> {
  console.log("🔍 Verificando si el servidor ya está corriendo...");

  try {
    const response = await fetch(DEV_URL);
    if (response.ok) {
      console.log("✅ Servidor ya está corriendo");
      return null;
    }
  } catch {
    console.log("🚀 Iniciando servidor de desarrollo...");
  }

  const devProcess = spawn("bun", ["run", "dev"], {
    cwd: PROJECT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  devProcess.stdout?.on("data", (data: Buffer) => {
    const output = data.toString();
    if (output.includes("Ready")) {
      console.log("✅ Servidor listo");
    }
  });

  devProcess.stderr?.on("data", (data: Buffer) => {
    const output = data.toString();
    if (!output.includes("ExperimentalWarning")) {
      console.error("Server error:", output);
    }
  });

  process.stdout.write("⏳ Esperando servidor");
  const serverReady = await waitForServer(DEV_URL);

  if (!serverReady) {
    devProcess.kill();
    throw new Error("Servidor no pudo iniciarse");
  }

  console.log("");
  return devProcess;
}

async function generatePdf(page: Page): Promise<void> {
  console.log(`📄 Navegando a ${MANUAL_URL}...`);
  await page.goto(MANUAL_URL, { waitUntil: "networkidle" });

  console.log("⏳ Esperando renderizado completo...");
  await page.waitForSelector(".manual-content", { timeout: 30000 });

  await page
    .waitForFunction(
      () => {
        const mermaidDivs = document.querySelectorAll(".mermaid");
        for (const div of mermaidDivs) {
          if (!div.querySelector("svg")) {
            return false;
          }
        }
        return true;
      },
      { timeout: 10000 },
    )
    .catch(() => {
      console.log("⚠️ Algunos diagramas Mermaid no se renderizaron");
    });

  await page.waitForTimeout(2000);

  console.log("🖨️ Generando PDF...");

  await page.pdf({
    path: OUTPUT_FILE,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "25mm",
      left: "20mm",
      right: "20mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="
        width: 100%;
        font-size: 9px;
        font-family: system-ui, sans-serif;
        color: #666;
        padding: 0 20mm;
        display: flex;
        justify-content: space-between;
      ">
        <span>Manual de Usuario - TPV El Haido</span>
        <span>v1.0.0</span>
      </div>
    `,
    footerTemplate: `
      <div style="
        width: 100%;
        font-size: 9px;
        font-family: system-ui, sans-serif;
        color: #666;
        padding: 0 20mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span>© ${new Date().getFullYear()} TPV El Haido</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
    preferCSSPageSize: false,
  });

  console.log(`✅ PDF generado: ${OUTPUT_FILE}`);
}

async function main(): Promise<void> {
  console.log("📚 Generador de PDF del Manual de Usuario\n");

  if (!existsSync(join(PROJECT_DIR, "src", "app", "manual-print"))) {
    console.error("❌ Error: La ruta /manual-print no existe");
    console.error("   Ejecuta primero: bun run manual:md");
    process.exit(1);
  }

  let devProcess: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    devProcess = await startDevServer();

    console.log("🌐 Iniciando navegador...");
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    const page = await context.newPage();

    await generatePdf(page);

    await browser.close();
    browser = null;
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (devProcess) {
      console.log("🛑 Deteniendo servidor de desarrollo...");
      devProcess.kill("SIGTERM");
    }
  }

  console.log("\n🎉 Proceso completado exitosamente");
}

main();
