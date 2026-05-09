import logger from '@mks2508/better-logger'

logger.preset('cyberpunk')
logger.showTimestamp()
logger.showLocation()

export const updateLogger = logger.scope('[UpdateService]')
export const licenseLogger = logger.scope('[LicenseService]')
export const cryptoLogger = logger.scope('[CryptoService]')
export const dbLogger = logger.scope('[Database]')
export const apiLogger = logger.scope('[API]')

export default logger
