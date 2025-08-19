import { Command } from '@tauri-apps/plugin-shell'
import {ThermalPrinterServiceOptions} from "@/models/ThermalPrinter.ts";
import {invoke} from "@tauri-apps/api/core";

async function runThermalPrinterCommand(printSequence: string): Promise<string> {
    try {
        const command = Command.sidecar('binaries/thermal-printer-cli', [
            '--printerConfig',
            'C:\\Users\\MKS\\Documents\\GitHub\\tpv-haido-tauri\\node-back\\src\\printerSettings.json',
            '--printSequence',
            printSequence
        ])

        const output = await command.execute()

        if (output.code !== 0) {
            throw new Error(`Command failed with code ${output.code}: ${output.stderr}`)
        }

        return output.stdout
    } catch (error) {
        console.error('Error executing thermal printer command:', error)
        throw error
    }
}


export async function writeJsonConfig(config: ThermalPrinterServiceOptions): Promise<void> {
    try {
        await invoke('write_json_config', { config })
        console.log('Configuración guardada exitosamente')
    } catch (error) {
        console.error('Error al guardar la configuración:', error)
        throw error
    }
}
export { runThermalPrinterCommand }