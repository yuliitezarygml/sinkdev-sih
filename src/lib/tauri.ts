import { invoke } from '@tauri-apps/api/core';
import {
  SteamAccountDto,
  TotpAccountDto,
  CodeResult,
  Confirmation,
  SecurityStatus,
  TimeDriftResult,
} from './types';

// Check if running in Tauri environment
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ========================
// MOCK STATE FOR DEV/BROWSER
// ========================
const STEAM_STORAGE_KEY = 'sinkdev_steam_dto_accounts';
const TOTP_STORAGE_KEY = 'sinkdev_totp_dto_accounts';
const SECURITY_STORAGE_KEY = 'sinkdev_security_status';

const defaultSteamAccounts: SteamAccountDto[] = [
  {
    id: 'demo-steam-1',
    account_name: 'pro_trader_777',
    steam_id: '76561198012345678',
    current_code: 'K3F89',
    seconds_left: 24,
    has_session: true,
    session_status: 'active',
    added_at: Date.now() - 86400000,
  },
];

const defaultTotpAccounts: TotpAccountDto[] = [
  {
    id: 'demo-totp-1',
    issuer: 'GitHub',
    label: 'dev@sinkdev.app',
    current_code: '492817',
    seconds_left: 19,
    period: 30,
    digits: 6,
    algorithm: 'SHA1',
    icon: null,
    added_at: Date.now() - 86400000,
  },
  {
    id: 'demo-totp-2',
    issuer: 'Google',
    label: 'personal@gmail.com',
    current_code: '903144',
    seconds_left: 11,
    period: 30,
    digits: 6,
    algorithm: 'SHA1',
    icon: null,
    added_at: Date.now() - 43200000,
  },
];

const defaultSecurity: SecurityStatus = {
  is_pin_set: false,
  is_locked: false,
  biometric_enabled: false,
  auto_lock_timeout_secs: 60,
  lock_on_background: true,
  clipboard_clear_secs: 30,
  total_steam: 1,
  total_totp: 2,
};

function getStoredSteam(): SteamAccountDto[] {
  if (typeof window === 'undefined') return defaultSteamAccounts;
  const raw = localStorage.getItem(STEAM_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STEAM_STORAGE_KEY, JSON.stringify(defaultSteamAccounts));
    return defaultSteamAccounts;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultSteamAccounts;
  }
}

function saveStoredSteam(accounts: SteamAccountDto[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STEAM_STORAGE_KEY, JSON.stringify(accounts));
  }
}

function getStoredTotp(): TotpAccountDto[] {
  if (typeof window === 'undefined') return defaultTotpAccounts;
  const raw = localStorage.getItem(TOTP_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(TOTP_STORAGE_KEY, JSON.stringify(defaultTotpAccounts));
    return defaultTotpAccounts;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultTotpAccounts;
  }
}

function saveStoredTotp(accounts: TotpAccountDto[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOTP_STORAGE_KEY, JSON.stringify(accounts));
  }
}

function getStoredSecurity(): SecurityStatus {
  if (typeof window === 'undefined') return defaultSecurity;
  const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(defaultSecurity));
    return defaultSecurity;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultSecurity;
  }
}

function saveStoredSecurity(sec: SecurityStatus) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(sec));
  }
}

// ========================
// STEAM GUARD API
// ========================

export async function getSteamAccounts(timeOffset = 0): Promise<SteamAccountDto[]> {
  if (!isTauri()) {
    return getStoredSteam();
  }
  return invoke<SteamAccountDto[]>('get_steam_accounts', { timeOffset });
}

export async function getSteamAccountCode(id: string, timeOffset = 0): Promise<CodeResult> {
  if (!isTauri()) {
    const chars = '23456789BCDFGHJKMNPQRTVWXY';
    const now = Math.floor(Date.now() / 1000) + timeOffset;
    const secondsLeft = 30 - (now % 30);
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return { code, seconds_left: secondsLeft };
  }
  return invoke<CodeResult>('get_steam_account_code', { id, timeOffset });
}

export async function renameSteamAccount(id: string, newName: string): Promise<void> {
  if (!isTauri()) {
    const list = getStoredSteam();
    const item = list.find((a) => a.id === id);
    if (item) {
      item.account_name = newName;
      saveStoredSteam(list);
    }
    return;
  }
  return invoke('rename_steam_account', { id, newName });
}

export async function removeSteamAccount(id: string): Promise<void> {
  if (!isTauri()) {
    const filtered = getStoredSteam().filter((a) => a.id !== id);
    saveStoredSteam(filtered);
    return;
  }
  return invoke('remove_steam_account', { id });
}

export async function importMaFile(content: string): Promise<SteamAccountDto> {
  if (!isTauri()) {
    const parsed = JSON.parse(content);
    const dto: SteamAccountDto = {
      id: 'steam_' + Math.random().toString(36).substring(2, 9),
      account_name: parsed.account_name || 'Imported Account',
      steam_id: String(parsed.Session?.SteamID || parsed.steamid || '76561198000000000'),
      current_code: 'R92KM',
      seconds_left: 30,
      has_session: !!parsed.Session?.SteamLoginSecure || !!parsed.Session?.OAuthToken,
      added_at: Date.now(),
    };
    const list = getStoredSteam();
    list.push(dto);
    saveStoredSteam(list);
    return dto;
  }
  return invoke<SteamAccountDto>('import_mafile', { content });
}

export async function addSteamAccount(data: {
  accountName?: string;
  account_name?: string;
  steamId?: string;
  steam_id?: string;
  sharedSecret?: string;
  shared_secret?: string;
  identitySecret?: string;
  identity_secret?: string;
  revocationCode?: string;
  revocation_code?: string;
  deviceId?: string;
  device_id?: string;
}): Promise<SteamAccountDto> {
  const accountName = data.accountName || data.account_name || 'Steam Account';
  const steamId = data.steamId || data.steam_id || '';
  const sharedSecret = data.sharedSecret || data.shared_secret || '';
  const identitySecret = data.identitySecret || data.identity_secret || '';
  const revocationCode = data.revocationCode || data.revocation_code || '';

  if (!isTauri()) {
    const dto: SteamAccountDto = {
      id: 'steam_' + Math.random().toString(36).substring(2, 9),
      account_name: accountName,
      steam_id: steamId,
      current_code: 'V3B89',
      seconds_left: 30,
      has_session: false,
      added_at: Date.now(),
    };
    const list = getStoredSteam();
    list.push(dto);
    saveStoredSteam(list);
    return dto;
  }
  return invoke<SteamAccountDto>('add_steam_account', {
    accountName,
    steamId,
    sharedSecret,
    identitySecret,
    revocationCode,
  });
}

export async function updateSteamSession(
  accountId: string,
  sessionId: string,
  steamLoginSecure: string
): Promise<void> {
  if (!isTauri()) {
    return;
  }
  return invoke('update_steam_session', { accountId, sessionId, steamLoginSecure });
}

export async function getSteamConfirmations(accountId: string, timeOffset = 0): Promise<Confirmation[]> {
  if (!isTauri()) {
    return [
      {
        id: 'conf_1001',
        nonce: 'nonce_abc1',
        creator_id: '1234567890',
        headline: 'Trade Offer with Gaben',
        summary: ['AK-47 | Redline (Field-Tested)', 'AWP | Asiimov (Battle-Scarred)'],
        icon: null,
        conf_type: 2,
        time_str: 'Just now',
      },
    ];
  }
  return invoke<Confirmation[]>('get_steam_confirmations', { accountId, timeOffset });
}

export async function respondSteamConfirmation(
  accountId: string,
  confId: string,
  confNonce: string,
  accept: boolean,
  timeOffset = 0
): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>('respond_steam_confirmation', {
    accountId,
    confId,
    confNonce,
    accept,
    timeOffset,
  });
}

// ========================
// 2FA / TOTP API
// ========================

export async function getTotpAccounts(): Promise<TotpAccountDto[]> {
  if (!isTauri()) {
    return getStoredTotp();
  }
  return invoke<TotpAccountDto[]>('get_totp_accounts');
}

export async function getTotpAccountCode(id: string): Promise<CodeResult> {
  if (!isTauri()) {
    const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return { code, seconds_left: secondsLeft };
  }
  return invoke<CodeResult>('get_totp_account_code', { id });
}

export async function renameTotpAccount(id: string, newIssuer: string, newLabel: string): Promise<void> {
  if (!isTauri()) {
    const list = getStoredTotp();
    const item = list.find((a) => a.id === id);
    if (item) {
      item.issuer = newIssuer;
      item.label = newLabel;
      saveStoredTotp(list);
    }
    return;
  }
  return invoke('rename_totp_account', { id, newIssuer, newLabel });
}

export async function removeTotpAccount(id: string): Promise<void> {
  if (!isTauri()) {
    const filtered = getStoredTotp().filter((a) => a.id !== id);
    saveStoredTotp(filtered);
    return;
  }
  return invoke('remove_totp_account', { id });
}

export async function addTotpAccount(data: {
  issuer: string;
  label: string;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
}): Promise<TotpAccountDto> {
  if (!isTauri()) {
    const dto: TotpAccountDto = {
      id: 'totp_' + Math.random().toString(36).substring(2, 9),
      issuer: data.issuer,
      label: data.label,
      current_code: '749102',
      seconds_left: data.period,
      period: data.period,
      digits: data.digits,
      algorithm: data.algorithm,
      icon: null,
      added_at: Date.now(),
    };
    const list = getStoredTotp();
    list.push(dto);
    saveStoredTotp(list);
    return dto;
  }
  return invoke<TotpAccountDto>('add_totp_account', {
    issuer: data.issuer,
    label: data.label,
    secret: data.secret,
    algorithm: data.algorithm,
    digits: data.digits,
    period: data.period,
  });
}

export async function parseOtpauthUri(uri: string): Promise<TotpAccountDto> {
  if (!isTauri()) {
    const url = new URL(uri);
    const params = url.searchParams;
    const issuer = params.get('issuer') || url.pathname.split(':')[0]?.replace('//totp/', '') || 'Authenticator';
    const label = decodeURIComponent(url.pathname.split(':')[1] || url.pathname.replace('//totp/', ''));
    const digits = parseInt(params.get('digits') || '6', 10);
    const period = parseInt(params.get('period') || '30', 10);
    const algorithm = params.get('algorithm') || 'SHA1';

    const dto: TotpAccountDto = {
      id: 'totp_' + Math.random().toString(36).substring(2, 9),
      issuer,
      label,
      current_code: '821943',
      seconds_left: period,
      period,
      digits,
      algorithm,
      icon: null,
      added_at: Date.now(),
    };
    const list = getStoredTotp();
    list.push(dto);
    saveStoredTotp(list);
    return dto;
  }
  return invoke<TotpAccountDto>('parse_otpauth_uri', { uri });
}

// ========================
// SECURITY & VAULT API
// ========================

export async function getSecurityStatus(): Promise<SecurityStatus> {
  if (!isTauri()) {
    return getStoredSecurity();
  }
  return invoke<SecurityStatus>('get_security_status');
}

export async function setupPin(pin: string): Promise<void> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.is_pin_set = true;
    sec.is_locked = false;
    saveStoredSecurity(sec);
    return;
  }
  return invoke('setup_pin', { pin });
}

export async function unlockVault(pin: string): Promise<boolean> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.is_locked = false;
    saveStoredSecurity(sec);
    return true;
  }
  return invoke<boolean>('unlock_vault', { pin });
}

export async function unlockVaultBiometric(): Promise<boolean> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.is_locked = false;
    saveStoredSecurity(sec);
    return true;
  }
  return invoke<boolean>('unlock_vault_biometric');
}

export async function lockVault(): Promise<void> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.is_locked = true;
    saveStoredSecurity(sec);
    return;
  }
  return invoke('lock_vault');
}

export async function removePin(currentPin: string): Promise<void> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.is_pin_set = false;
    sec.is_locked = false;
    saveStoredSecurity(sec);
    return;
  }
  return invoke('remove_pin', { currentPin });
}

export async function changePin(oldPin: string, newPin: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  return invoke('change_pin', { oldPin, newPin });
}

export async function updateSecuritySettings(params: {
  autoLockTimeoutSecs: number;
  lockOnBackground: boolean;
  biometricEnabled: boolean;
  clipboardClearSecs: number;
}): Promise<void> {
  if (!isTauri()) {
    const sec = getStoredSecurity();
    sec.auto_lock_timeout_secs = params.autoLockTimeoutSecs;
    sec.lock_on_background = params.lockOnBackground;
    sec.biometric_enabled = params.biometricEnabled;
    sec.clipboard_clear_secs = params.clipboardClearSecs;
    saveStoredSecurity(sec);
    return;
  }
  return invoke('update_security_settings', {
    autoLockTimeoutSecs: params.autoLockTimeoutSecs,
    lockOnBackground: params.lockOnBackground,
    biometricEnabled: params.biometricEnabled,
    clipboardClearSecs: params.clipboardClearSecs,
  });
}

export async function checkSystemTime(): Promise<TimeDriftResult> {
  if (!isTauri()) {
    return {
      local_time: Math.floor(Date.now() / 1000),
      server_time: Math.floor(Date.now() / 1000),
      drift_seconds: 0,
      is_drift_detected: false,
    };
  }
  return invoke<TimeDriftResult>('check_system_time');
}

// Clipboard with optional auto-clear
let clipboardClearTimer: NodeJS.Timeout | null = null;

export async function copyToClipboardWithAutoClear(
  text: string,
  clearSecs = 30
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);

    if (clipboardClearTimer) {
      clearTimeout(clipboardClearTimer);
      clipboardClearTimer = null;
    }

    if (clearSecs > 0) {
      clipboardClearTimer = setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // ignore clipboard read errors on mobile
        }
      }, clearSecs * 1000);
    }
  }
}

// ========================
// ENCRYPTED BACKUP & BATCH IMPORT
// ========================

export async function exportEncryptedVault(passphrase: string): Promise<string> {
  if (!isTauri()) {
    const isEncrypted = passphrase.trim().length > 0;
    const payload = {
      version: 1,
      encrypted: isEncrypted,
      salt: isEncrypted ? 'mock_salt_b64' : '',
      nonce: isEncrypted ? 'mock_nonce_b64' : '',
      ciphertext: btoa(JSON.stringify({
        steam_accounts: getStoredSteam(),
        totp_accounts: getStoredTotp(),
      })),
    };
    return JSON.stringify(payload, null, 2);
  }
  return invoke<string>('export_encrypted_vault', { passphrase });
}

export async function importEncryptedVault(
  passphrase: string,
  backupPayload: string,
  merge = true
): Promise<import('./types').BackupRestoreSummary> {
  if (!isTauri()) {
    try {
      const parsed = JSON.parse(backupPayload);
      const isEncrypted = parsed.encrypted ?? (!!parsed.salt && !!parsed.nonce);
      if (isEncrypted && !passphrase.trim()) {
        throw new Error('This backup is protected with a password. Please enter the password.');
      }
      const rawJson = parsed.ciphertext ? atob(parsed.ciphertext) : backupPayload;
      const decoded = JSON.parse(rawJson);
      let steam = decoded.steam_accounts || [];
      let totp = decoded.totp_accounts || [];

      // Detect 2FAS format
      if (Array.isArray(decoded.services)) {
        for (const s of decoded.services) {
          const otp = s.otp || {};
          let secret = (s.secret || '').trim();
          if (!secret && otp.link) {
            try {
              const u = new URL(otp.link);
              secret = u.searchParams.get('secret') || '';
            } catch {}
          }
          secret = secret.replace(/\s+/g, '').toUpperCase();
          if (!secret) continue;
          const issuer = (otp.issuer || s.name || '2FA').trim();
          const label = (otp.label || otp.account || s.name || 'Account').trim();
          const period = otp.period || 30;
          const digits = otp.digits || 6;
          const algorithm = (otp.algorithm || 'SHA1').toUpperCase();

          totp.push({
            id: 'totp_' + Math.random().toString(36).substring(2, 9),
            issuer,
            label,
            current_code: '123456',
            seconds_left: period,
            period,
            digits,
            algorithm,
            icon: null,
            added_at: s.updatedAt || Date.now(),
          });
        }
      }

      if (merge) {
        const curSteam = getStoredSteam();
        const curTotp = getStoredTotp();
        steam = [...curSteam, ...steam.filter((s: import('./types').SteamAccountDto) => !curSteam.some(c => c.steam_id === s.steam_id))];
        totp = [...curTotp, ...totp.filter((t: import('./types').TotpAccountDto) => !curTotp.some(c => c.id === t.id))];
      }

      saveStoredSteam(steam);
      saveStoredTotp(totp);

      return {
        steam_restored: steam.length,
        totp_restored: totp.length,
        total_accounts: steam.length + totp.length,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid backup file or decryption failed';
      throw new Error(msg);
    }
  }
  return invoke<import('./types').BackupRestoreSummary>('import_encrypted_vault', {
    passphrase,
    backupPayload,
    merge,
  });
}

export async function importBatchMafiles(contents: string[]): Promise<import('./types').BatchImportResult> {
  if (!isTauri()) {
    let imported = 0;
    let failed = 0;
    const accountNames: string[] = [];
    const list = getStoredSteam();

    for (const c of contents) {
      try {
        const parsed = JSON.parse(c);
        const name = parsed.account_name || 'Imported Account';
        accountNames.push(name);
        list.push({
          id: 'steam_' + Math.random().toString(36).substring(2, 9),
          account_name: name,
          steam_id: String(parsed.Session?.SteamID || parsed.steamid || '76561198000000000'),
          current_code: 'R92KM',
          seconds_left: 30,
          has_session: true,
          added_at: Date.now(),
        });
        imported++;
      } catch {
        failed++;
      }
    }
    saveStoredSteam(list);
    return { imported, failed, account_names: accountNames };
  }
  return invoke<import('./types').BatchImportResult>('import_batch_mafiles', { contents });
}

export async function getSteamConfirmationDetails(
  accountId: string,
  confId: string,
  timeOffset = 0
): Promise<string> {
  if (!isTauri()) {
    return `<div style="padding:10px; color:#c7d5e0;">
      <h4 style="color:#66c0f4;font-weight:bold;">Trade Offer #` + confId + `</h4>
      <p style="font-size:12px;color:#8f98a0;margin-top:4px;">CS2 / Dota2 Trade details preview</p>
      <div style="margin-top:12px;padding:8px;background:#171a21;border-radius:8px;border:1px solid #2a475e;">
        <span style="font-size:11px;color:#a4d007;">✓ Verified items from Steam Community Market</span>
      </div>
    </div>`;
  }
  return invoke<string>('get_steam_confirmation_details', {
    accountId,
    confId,
    timeOffset,
  });
}

export async function importGoogleMigration(
  uri: string
): Promise<import('./types').TotpAccountDto[]> {
  if (!isTauri()) {
    return [
      {
        id: 'totp_imported_' + Date.now(),
        issuer: 'Google',
        label: 'imported@gmail.com',
        current_code: '492 104',
        seconds_left: 30,
        period: 30,
        digits: 6,
        algorithm: 'SHA1',
        icon: null,
        added_at: Date.now(),
      }
    ];
  }
  return invoke<import('./types').TotpAccountDto[]>('import_google_migration', { uri });
}

export async function import2FasBackup(
  content: string
): Promise<import('./types').TotpAccountDto[]> {
  if (!isTauri()) {
    const data = JSON.parse(content);
    const added: import('./types').TotpAccountDto[] = [];
    const curTotp = getStoredTotp();

    for (const s of data.services || []) {
      const otp = s.otp || {};
      let secret = (s.secret || '').trim();
      if (!secret && otp.link) {
        try {
          const u = new URL(otp.link);
          secret = u.searchParams.get('secret') || '';
        } catch {}
      }
      secret = secret.replace(/\s+/g, '').toUpperCase();
      if (!secret) continue;
      const issuer = (otp.issuer || s.name || '2FA').trim();
      const label = (otp.label || otp.account || s.name || 'Account').trim();
      const period = otp.period || 30;
      const digits = otp.digits || 6;
      const algorithm = (otp.algorithm || 'SHA1').toUpperCase();

      const dto: import('./types').TotpAccountDto = {
        id: 'totp_' + Math.random().toString(36).substring(2, 9),
        issuer,
        label,
        current_code: '654 321',
        seconds_left: period,
        period,
        digits,
        algorithm,
        icon: null,
        added_at: s.updatedAt ? Math.floor(s.updatedAt / 1000) : Math.floor(Date.now() / 1000),
      };
      if (!curTotp.some(existing => existing.issuer === dto.issuer && existing.label === dto.label)) {
        added.push(dto);
        curTotp.push(dto);
      }
    }
    saveStoredTotp(curTotp);
    return added;
  }
  return invoke<import('./types').TotpAccountDto[]>('import_2fas_backup', { content });
}


