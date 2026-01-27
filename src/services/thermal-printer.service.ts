import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import { Command } from '@tauri-apps/plugin-shell';
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter.ts';

async function runThermalPrinterCommand(printSequence: string): Promise<string> {
  try {
    // Get the app data directory path dynamically
    const appDir = await appDataDir();
    const configPath = `${appDir}printerSettings.json`;

    // Handle test connection command
    if (printSequence === '[TEST_CONNECTION]') {
      console.log('Testing printer connection...');
      const testCommand = Command.sidecar('binaries/thermal-printer-cli', [
        '--printerConfig',
        configPath,
        '--testConnection',
      ]);

      const testOutput = await testCommand.execute();

      if (testOutput.code !== 0) {
        throw new Error(
          `Connection test failed with code ${testOutput.code}: ${testOutput.stderr}`
        );
      }

      console.log('Printer connection test successful');
      return testOutput.stdout;
    }

    // Parse print sequence to handle special commands
    const commands = printSequence.split('\n');
    let processedSequence = '';
    let hasCashDrawerCommand = false;

    for (const command of commands) {
      if (command === '[CASH_DRAWER]') {
        hasCashDrawerCommand = true;
        console.log('Cash drawer command detected in print sequence');
      } else if (command.startsWith('[IMAGE:')) {
        // Handle image printing
        const imagePath = command.replace('[IMAGE:', '').replace(']', '');
        processedSequence += `[IMAGE:${imagePath}]\n`;
        console.log('Image print command added:', imagePath);
      } else if (command === '[CUT]') {
        processedSequence += '[CUT]\n';
        console.log('Cut command added to sequence');
      } else if (command.trim()) {
        processedSequence += `${command}\n`;
      }
    }

    const cliArgs = ['--printerConfig', configPath, '--printSequence', processedSequence.trim()];

    // Add cash drawer flag if needed
    if (hasCashDrawerCommand) {
      cliArgs.push('--openCashDrawer');
      console.log('Adding --openCashDrawer flag to CLI command');
    }

    console.log('Executing thermal printer command with args:', cliArgs);
    const command = Command.sidecar('binaries/thermal-printer-cli', cliArgs);

    const output = await command.execute();

    if (output.code !== 0) {
      console.error('Thermal printer command failed:', {
        code: output.code,
        stderr: output.stderr,
        stdout: output.stdout,
      });
      throw new Error(`Command failed with code ${output.code}: ${output.stderr}`);
    }

    console.log('Thermal printer command executed successfully');
    return output.stdout;
  } catch (error) {
    console.error('Error executing thermal printer command:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      printSequence: printSequence,
    });
    throw error;
  }
}

export async function openCashDrawerOnly(): Promise<string> {
  try {
    const appDir = await appDataDir();
    const configPath = `${appDir}printerSettings.json`;

    console.log('Attempting to open cash drawer only...');
    const command = Command.sidecar('binaries/thermal-printer-cli', [
      '--printerConfig',
      configPath,
      '--openCashDrawerOnly',
    ]);

    const output = await command.execute();

    if (output.code !== 0) {
      console.error('Cash drawer open command failed:', {
        code: output.code,
        stderr: output.stderr,
        stdout: output.stdout,
      });
      throw new Error(`Cash drawer command failed with code ${output.code}: ${output.stderr}`);
    }

    console.log('Cash drawer opened successfully');
    return output.stdout;
  } catch (error) {
    console.error('Error opening cash drawer:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

export async function writeJsonConfig(config: ThermalPrinterServiceOptions): Promise<void> {
  try {
    console.log('Saving thermal printer configuration:', config);
    await invoke('write_json_config', { config });
    console.log('Configuración guardada exitosamente');
  } catch (error) {
    console.error('Error al guardar la configuración:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      config: config,
    });
    throw error;
  }
}

export { runThermalPrinterCommand };
