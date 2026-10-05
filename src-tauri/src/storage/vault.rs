use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::Manager;
use sha2::{Digest, Sha256};
use crate::crypto::{steam_totp, totp::{self, Algorithm}};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamAccount {
    pub id: String,
    pub account_name: String,
    pub steam_id: String,
    pub shared_secret: String,
    pub identity_secret: String,
    pub revocation_code: String,
    pub device_id: String,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub steam_login_secure: Option<String>,
    #[serde(default)]
    pub refresh_token: Option<String>,
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotpAccount {
    pub id: String,
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub algorithm: String,
    pub digits: u32,
    pub period: u64,
    pub icon: Option<String>,
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub is_pin_enabled: bool,
    pub pin_hash: Option<String>,
    pub pin_salt: Option<String>,
    pub biometric_enabled: bool,
    pub auto_lock_timeout_secs: u64, // 0 = never, 30, 60, 300, etc.
    pub lock_on_background: bool,
    pub clipboard_clear_secs: u64,   // e.g. 30
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            is_pin_enabled: false,
            pin_hash: None,
            pin_salt: None,
            biometric_enabled: false,
            auto_lock_timeout_secs: 60,
            lock_on_background: true,
            clipboard_clear_secs: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppData {
    pub steam_accounts: Vec<SteamAccount>,
    pub totp_accounts: Vec<TotpAccount>,
    #[serde(default)]
    pub security: SecuritySettings,
}

// In-memory runtime session tracking whether vault is currently unlocked
pub struct VaultSession {
    pub is_unlocked: Mutex<bool>,
}

impl VaultSession {
    pub fn new() -> Self {
        Self {
            is_unlocked: Mutex::new(false),
        }
    }
}

// ==========================================
// SAFE DTOs - NEVER EXPOSE SECRETS TO UI
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamAccountDto {
    pub id: String,
    pub account_name: String,
    pub steam_id: String,
    pub current_code: String,
    pub seconds_left: u64,
    pub has_session: bool,
    pub session_status: String,
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotpAccountDto {
    pub id: String,
    pub issuer: String,
    pub label: String,
    pub current_code: String,
    pub seconds_left: u64,
    pub period: u64,
    pub digits: u32,
    pub algorithm: String,
    pub icon: Option<String>,
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityStatusDto {
    pub is_pin_set: bool,
    pub is_locked: bool,
    pub biometric_enabled: bool,
    pub auto_lock_timeout_secs: u64,
    pub lock_on_background: bool,
    pub clipboard_clear_secs: u64,
    pub total_steam: usize,
    pub total_totp: usize,
}

pub fn hash_pin(pin: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(pin.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn to_steam_dto(account: &SteamAccount, time_offset: i64) -> SteamAccountDto {
    let current_code = steam_totp::generate_steam_code(&account.shared_secret, time_offset)
        .unwrap_or_else(|_| "-----".to_string());
    let seconds_left = steam_totp::seconds_until_change(time_offset);
    let session_status = if account.refresh_token.is_some() {
        "active".to_string()
    } else if account.steam_login_secure.is_some() {
        "expiring".to_string()
    } else {
        "none".to_string()
    };

    SteamAccountDto {
        id: account.id.clone(),
        account_name: account.account_name.clone(),
        steam_id: account.steam_id.clone(),
        current_code,
        seconds_left,
        has_session: account.refresh_token.is_some() || account.steam_login_secure.is_some(),
        session_status,
        added_at: account.added_at,
    }
}

pub fn to_totp_dto(account: &TotpAccount) -> TotpAccountDto {
    let algo = match account.algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };
    let current_code = totp::generate_totp(&account.secret, account.digits, account.period, &algo)
        .unwrap_or_else(|_| "------".to_string());
    let seconds_left = totp::seconds_until_totp_change(account.period);
    TotpAccountDto {
        id: account.id.clone(),
        issuer: account.issuer.clone(),
        label: account.label.clone(),
        current_code,
        seconds_left,
        period: account.period,
        digits: account.digits,
        algorithm: account.algorithm.clone(),
        icon: account.icon.clone(),
        added_at: account.added_at,
    }
}

pub fn load_data(app: &tauri::AppHandle) -> Result<AppData, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_dir.join("accounts.json");
    
    if !file_path.exists() {
        return Ok(AppData::default());
    }
    
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_data(app: &tauri::AppHandle, data: &AppData) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    
    let file_path = app_dir.join("accounts.json");
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    
    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_pin() {
        let salt = "fixed_salt_123";
        let pin = "1234";
        let hash1 = hash_pin(pin, salt);
        let hash2 = hash_pin(pin, salt);
        assert_eq!(hash1, hash2);

        let hash_diff_pin = hash_pin("5678", salt);
        assert_ne!(hash1, hash_diff_pin);

        let hash_diff_salt = hash_pin(pin, "other_salt");
        assert_ne!(hash1, hash_diff_salt);
    }

    #[test]
    fn test_steam_dto_strips_secrets() {
        let account = SteamAccount {
            id: "test-id".to_string(),
            account_name: "TestUser".to_string(),
            steam_id: "76561198000000000".to_string(),
            shared_secret: "kR6pW5d+YgN4fQ==".to_string(),
            identity_secret: "mO4rS7e+XhP5gR==".to_string(),
            revocation_code: "R12345".to_string(),
            device_id: "android:12345".to_string(),
            session_id: Some("session123".to_string()),
            steam_login_secure: Some("secure_jwt".to_string()),
            refresh_token: Some("oauth_token".to_string()),
            added_at: 1000,
        };

        let dto = to_steam_dto(&account, 0);
        assert_eq!(dto.id, "test-id");
        assert_eq!(dto.account_name, "TestUser");
        assert_eq!(dto.current_code.len(), 5);
        assert!(dto.has_session);
        // Ensure serialization of DTO has no secret fields
        let json = serde_json::to_string(&dto).unwrap();
        assert!(!json.contains("shared_secret"));
        assert!(!json.contains("identity_secret"));
        assert!(!json.contains("session123"));
        assert!(!json.contains("secure_jwt"));
        assert!(!json.contains("oauth_token"));
    }

    #[test]
    fn test_totp_dto_strips_secrets() {
        let account = TotpAccount {
            id: "totp-id".to_string(),
            issuer: "GitHub".to_string(),
            label: "dev@example.com".to_string(),
            secret: "JBSWY3DPEHPK3PXP".to_string(),
            algorithm: "SHA1".to_string(),
            digits: 6,
            period: 30,
            icon: None,
            added_at: 1000,
        };

        let dto = to_totp_dto(&account);
        assert_eq!(dto.id, "totp-id");
        assert_eq!(dto.issuer, "GitHub");
        assert_eq!(dto.current_code.len(), 6);
        let json = serde_json::to_string(&dto).unwrap();
        assert!(!json.contains("secret"));
        assert!(!json.contains("JBSWY3DPEHPK3PXP"));
    }
}

