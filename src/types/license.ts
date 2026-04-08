export type LicenseType = 'basic' | 'pro' | 'enterprise';

export interface LicenseStatus {
  isActivated: boolean;
  isValid: boolean;
  expiresAt?: number | null;
  email?: string | null;
  daysRemaining?: number | null;
  licenseType?: string | null;
  errorMessage?: string | null;
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
