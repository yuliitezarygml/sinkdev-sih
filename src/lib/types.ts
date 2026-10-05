// Safe DTOs returned by Rust backend - secrets are never returned to UI
export interface SteamAccountDto {
  id: string;
  account_name: string;
  steam_id: string;
  current_code: string;
  seconds_left: number;
  has_session: boolean;
  session_status?: 'active' | 'expiring' | 'none';
  added_at: number;
}

export interface TotpAccountDto {
  id: string;
  issuer: string;
  label: string;
  current_code: string;
  seconds_left: number;
  period: number;
  digits: number;
  algorithm: string;
  icon: string | null;
  added_at: number;
}

export interface CodeResult {
  code: string;
  seconds_left: number;
}

export interface Confirmation {
  id: string;
  nonce: string;
  creator_id: string;
  headline: string;
  summary: string[];
  icon: string | null;
  conf_type: number;
  time_str: string;
}

export interface SecurityStatus {
  is_pin_set: boolean;
  is_locked: boolean;
  biometric_enabled: boolean;
  auto_lock_timeout_secs: number;
  lock_on_background: boolean;
  clipboard_clear_secs: number;
  total_steam: number;
  total_totp: number;
}

export interface TimeDriftResult {
  local_time: number;
  server_time: number;
  drift_seconds: number;
  is_drift_detected: boolean;
}

export interface BackupRestoreSummary {
  steam_restored: number;
  totp_restored: number;
  total_accounts: number;
}

export interface BatchImportResult {
  imported: number;
  failed: number;
  account_names: string[];
}
