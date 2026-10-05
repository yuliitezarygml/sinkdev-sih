use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;
use crate::storage::vault::AppData;

#[derive(Serialize, Deserialize)]
pub struct BackupPayload {
    pub version: u32,
    pub salt: String,
    pub nonce: String,
    pub ciphertext: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BackupRestoreSummary {
    pub steam_restored: usize,
    pub totp_restored: usize,
    pub total_accounts: usize,
}

// Derive a 256-bit (32 byte) key from passphrase and salt
fn derive_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    let mut hasher = Sha256::new();
    hasher.update(passphrase.as_bytes());
    hasher.update(salt);
    let mut result = hasher.finalize();

    // 10,000 rounds of hash stretching
    for _ in 0..10_000 {
        let mut next_hasher = Sha256::new();
        next_hasher.update(&result);
        next_hasher.update(passphrase.as_bytes());
        result = next_hasher.finalize();
    }

    key.copy_from_slice(&result);
    key
}

pub fn export_encrypted_vault_data(data: &AppData, passphrase: &str) -> Result<String, String> {
    if passphrase.trim().is_empty() {
        return Err("Passphrase cannot be empty".to_string());
    }

    let salt_bytes = Uuid::new_v4().as_bytes().to_owned();
    let nonce_raw = Uuid::new_v4().as_bytes()[..12].to_vec();

    let key = derive_key(passphrase, &salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_raw);

    let plaintext = serde_json::to_vec(data).map_err(|e| e.to_string())?;
    let ciphertext = cipher.encrypt(nonce, plaintext.as_ref())
        .map_err(|e| format!("Encryption error: {}", e))?;

    let payload = BackupPayload {
        version: 1,
        salt: BASE64.encode(salt_bytes),
        nonce: BASE64.encode(nonce_raw),
        ciphertext: BASE64.encode(ciphertext),
    };

    serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
}

pub fn import_encrypted_vault_data(passphrase: &str, encrypted_json: &str) -> Result<AppData, String> {
    if passphrase.trim().is_empty() {
        return Err("Passphrase cannot be empty".to_string());
    }

    let payload: BackupPayload = serde_json::from_str(encrypted_json)
        .map_err(|_| "Invalid backup file format. Expected JSON backup object.".to_string())?;

    let salt_bytes = BASE64.decode(&payload.salt)
        .map_err(|_| "Failed to decode backup salt".to_string())?;
    let nonce_bytes = BASE64.decode(&payload.nonce)
        .map_err(|_| "Failed to decode backup nonce".to_string())?;
    let ciphertext = BASE64.decode(&payload.ciphertext)
        .map_err(|_| "Failed to decode backup ciphertext".to_string())?;

    if nonce_bytes.len() != 12 {
        return Err("Invalid nonce length in backup".to_string());
    }

    let key = derive_key(passphrase, &salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed. Incorrect backup password or corrupted backup file.".to_string())?;

    serde_json::from_slice::<AppData>(&plaintext)
        .map_err(|e| format!("Failed to parse decrypted accounts: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::vault::{SteamAccount, TotpAccount};

    fn sample_data() -> AppData {
        AppData {
            steam_accounts: vec![SteamAccount {
                id: "steam-1".to_string(),
                account_name: "Gaben".to_string(),
                steam_id: "76561198000000000".to_string(),
                shared_secret: "kR6pW5d+YgN4fQ==".to_string(),
                identity_secret: "mO4rS7e+XhP5gR==".to_string(),
                revocation_code: "R12345".to_string(),
                device_id: "android:1234".to_string(),
                session_id: None,
                steam_login_secure: None,
                refresh_token: None,
                added_at: 1000,
            }],
            totp_accounts: vec![TotpAccount {
                id: "totp-1".to_string(),
                issuer: "Discord".to_string(),
                label: "user#0001".to_string(),
                secret: "JBSWY3DPEHPK3PXP".to_string(),
                algorithm: "SHA1".to_string(),
                digits: 6,
                period: 30,
                icon: None,
                added_at: 1000,
            }],
            security: Default::default(),
        }
    }

    #[test]
    fn test_backup_encrypt_decrypt_success() {
        let original = sample_data();
        let pass = "CorrectHorseBatteryStaple!";

        let encrypted = export_encrypted_vault_data(&original, pass).expect("Export should succeed");
        assert!(encrypted.contains("ciphertext"));
        assert!(!encrypted.contains("Gaben")); // Ensure plain secrets are NOT visible in JSON
        assert!(!encrypted.contains("JBSWY3DPEHPK3PXP"));

        let restored = import_encrypted_vault_data(pass, &encrypted).expect("Import should succeed");
        assert_eq!(restored.steam_accounts.len(), 1);
        assert_eq!(restored.steam_accounts[0].account_name, "Gaben");
        assert_eq!(restored.totp_accounts.len(), 1);
        assert_eq!(restored.totp_accounts[0].issuer, "Discord");
    }

    #[test]
    fn test_backup_wrong_password_fails() {
        let original = sample_data();
        let encrypted = export_encrypted_vault_data(&original, "Password123").unwrap();

        let err = import_encrypted_vault_data("WrongPassword!", &encrypted).unwrap_err();
        assert!(err.contains("Incorrect backup password"));
    }

    #[test]
    fn test_backup_corrupted_ciphertext_fails() {
        let original = sample_data();
        let encrypted = export_encrypted_vault_data(&original, "Password123").unwrap();

        let mut payload: BackupPayload = serde_json::from_str(&encrypted).unwrap();
        // Corrupt the ciphertext by flipping a character
        payload.ciphertext = format!("A{}", &payload.ciphertext[1..]);
        let corrupted_json = serde_json::to_string(&payload).unwrap();

        let err = import_encrypted_vault_data("Password123", &corrupted_json).unwrap_err();
        assert!(err.contains("Decryption failed"));
    }
}
