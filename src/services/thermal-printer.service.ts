import { Command } from '@tauri-apps/api/shell'
import { invoke } from "@tauri-apps/api/tauri"
import { appDataDir } from '@tauri-apps/api/path'
import { tryCatchAsync, type Result, type ResultError } from '@mks2508/no-throw'
import { ThermalPrinterServiceOptions } from "@/models/ThermalPrinter"
import { PrinterErrorCode } from "@/lib/error-codes"

type PrinterResult<T> = Result<T, ResultError<typeof PrinterErrorCode[keyof typeof PrinterErrorCode]>>

async function runThermalPrinterCommand(printSequence: string): Promise<PrinterResult<string>> {
    return tryCatchAsync(async () => {
        const appDir = await appDataDir()
        const configPath = `${appDir}printerSettings.json`

        // Handle test connection command
        if (printSequence === '[TEST_CONNECTION]') {
            console.log('Testing printer connection...')
            const testCommand = Command.sidecar('thermal-printer-cli', [
                '--printerConfig',
                configPath,
                '--testConnection'
            ])

            const testOutput = await testCommand.execute()

            if (testOutput.code !== 0) {
                throw new Error(`Connection test failed with code ${testOutput.code}: ${testOutput.stderr}`)
            }

            console.log('Printer connection test successful')
            return testOutput.stdout
        }

        // Parse print sequence to handle special commands
        const commands = printSequence.split('\n')
        let processedSequence = ''
        let hasCashDrawerCommand = false

        for (const command of commands) {
            if (command === '[CASH_DRAWER]') {
                hasCashDrawerCommand = true
                console.log('Cash drawer command detected in print sequence')
            } else if (command.startsWith('[IMAGE:')) {
                const imagePath = command.replace('[IMAGE:', '').replace(']', '')
                processedSequence += `[IMAGE:${imagePath}]\n`
                console.log('Image print command added:', imagePath)
            } else if (command === '[CUT]') {
                processedSequence += '[CUT]\n'
                console.log('Cut command added to sequence')
            } else if (command.trim()) {
                processedSequence += command + '\n'
            }
        }

        const cliArgs = [
            '--printerConfig',
            configPath,
            '--printSequence',
            processedSequence.trim()
        ]

        if (hasCashDrawerCommand) {
            cliArgs.push('--openCashDrawer')
            console.log('Adding --openCashDrawer flag to CLI command')
        }

        console.log('Executing thermal printer command with args:', cliArgs)
        const command = Command.sidecar('thermal-printer-cli', cliArgs)

        const output = await command.execute()

        if (output.code !== 0) {
            console.error('Thermal printer command failed:', {
                code: output.code,
                stderr: output.stderr,
                stdout: output.stdout
            })
            throw new Error(`Command failed with code ${output.code}: ${output.stderr}`)
        }

        console.log('Thermal printer command executed successfully')
        return output.stdout
    }, PrinterErrorCode.PrintFailed)
}

export async function openCashDrawerOnly(): Promise<PrinterResult<string>> {
    return tryCatchAsync(async () => {
        const appDir = await appDataDir()
        const configPath = `${appDir}printerSettings.json`

        console.log('Attempting to open cash drawer only...')
        const command = Command.sidecar('thermal-printer-cli', [
            '--printerConfig',
            configPath,
            '--openCashDrawerOnly'
        ])

        const output = await command.execute()

        if (output.code !== 0) {
            console.error('Cash drawer open command failed:', {
                code: output.code,
                stderr: output.stderr,
                stdout: output.stdout
            })
            throw new Error(`Cash drawer command failed with code ${output.code}: ${output.stderr}`)
        }

        console.log('Cash drawer opened successfully')
        return output.stdout
    }, PrinterErrorCode.CashDrawerFailed)
}

export async function writeJsonConfig(config: ThermalPrinterServiceOptions): Promise<PrinterResult<void>> {
    return tryCatchAsync(async () => {
        console.log('Saving thermal printer configuration:', config)
        await invoke('write_json_config', { config })
        console.log('Configuracion guardada exitosamente')
    }, PrinterErrorCode.ConfigError)
}

export async function testPrinterConnection(): Promise<PrinterResult<string>> {
    return runThermalPrinterCommand('[TEST_CONNECTION]')
}

export { runThermalPrinterCommand }
