/**
 * Response shape v2 for Tauri updater
 * https://v2.tauri.app/plugin/updater/
 */
export interface IUpdateResponse {
  version: string
  notes: string
  pub_date: string // ISO 8601
  url: string
  signature: string
}

/** Request body for license validate/activate */
export interface ILicenseRequest {
  key: string
  email: string
  machine_fingerprint: string
}

/** Response for successful license validation */
export interface ILicenseValidResponse {
  valid: true
  license_type: 'master' | 'regular'
  email: string
  expires_at: string | null
}

/** Response for failed license validation (controlled) */
export interface ILicenseInvalidResponse {
  valid: false
  error: string
  code: string
}

export type ILicenseResponse = ILicenseValidResponse | ILicenseInvalidResponse

/** Healthcheck response */
export interface IHealthResponse {
  status: 'ok'
  version: string
  db: 'connected' | 'error'
}
