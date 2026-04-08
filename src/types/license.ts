export type LicenseType = 'basic' | 'pro' | 'enterprise';

export interface LicenseStatus {
  is_activated: boolean;
  is_valid: boolean;
  expires_at?: number | null;
  email?: string | null;
  days_remaining?: number | null;
  license_type?: string | null;
  error_message?: string | null;
}

export interface LicenseActivationRequest {
  key: string;
  email: string;
}

export interface LicenseValidationRequest {
  key: string;
  email: string;
  machine_fingerprint: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  expires_at?: number;
  user_email: string;
  license_type: string;
  error?: string;
}
