use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use crate::storage::vault::{self, hash_pin, SecurityStatusDto, VaultSession};

#[derive(Serialize, Deserialize)]
pub struct TimeDriftDto {
    pub local_time: i64,
    pub server_time: i64,
    pub drift_seconds: i64,
    pub is_drift_detected: bool,
}

#[derive(Deserialize)]
struct SteamTimeResponse {
    response: SteamTimeInner,
}

#[derive(Deserialize)]
struct SteamTimeInner {
    server_time: String,
}

#[tauri::command]
pub async fn get_security_status(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
) -> Result<SecurityStatusDto, String> {
    let data = vault::load_data(&app)?;
    let is_pin_set = data.security.is_pin_enabled && data.security.pin_hash.is_some();
    let is_locked = if is_pin_set {
        let unlocked = *session.is_unlocked.lock().map_err(|e| e.to_string())?;
        !unlocked
    } else {
        false
    };

    Ok(SecurityStatusDto {
        is_pin_set,
        is_locked,
        biometric_enabled: data.security.biometric_enabled,
        auto_lock_timeout_secs: data.security.auto_lock_timeout_secs,
        lock_on_background: data.security.lock_on_background,
        clipboard_clear_secs: data.security.clipboard_clear_secs,
        total_steam: data.steam_accounts.len(),
        total_totp: data.totp_accounts.len(),
    })
}

#[tauri::command]
pub async fn setup_pin(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    pin: String,
) -> Result<(), String> {
    if pin.len() < 4 {
        return Err("PIN must be at least 4 digits".to_string());
    }

    let mut data = vault::load_data(&app)?;
    let salt = Uuid::new_v4().to_string();
    let hashed = hash_pin(&pin, &salt);

    data.security.is_pin_enabled = true;
    data.security.pin_salt = Some(salt);
    data.security.pin_hash = Some(hashed);
    vault::save_data(&app, &data)?;

    if let Ok(mut unlocked) = session.is_unlocked.lock() {
        *unlocked = true;
    }

    Ok(())
}

#[tauri::command]
pub async fn unlock_vault(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    pin: String,
) -> Result<bool, String> {
    let data = vault::load_data(&app)?;
    if !data.security.is_pin_enabled {
        if let Ok(mut unlocked) = session.is_unlocked.lock() {
            *unlocked = true;
        }
        return Ok(true);
    }

    let salt = data.security.pin_salt.as_deref().unwrap_or_default();
    let expected_hash = data.security.pin_hash.as_deref().unwrap_or_default();
    let input_hash = hash_pin(&pin, salt);

    if input_hash == expected_hash {
        if let Ok(mut unlocked) = session.is_unlocked.lock() {
            *unlocked = true;
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn unlock_vault_biometric(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
) -> Result<bool, String> {
    let data = vault::load_data(&app)?;
    if !data.security.is_pin_enabled || data.security.biometric_enabled {
        if let Ok(mut unlocked) = session.is_unlocked.lock() {
            *unlocked = true;
        }
        return Ok(true);
    }
    Err("Biometric unlock is not enabled".to_string())
}


#[tauri::command]
pub async fn lock_vault(session: tauri::State<'_, VaultSession>) -> Result<(), String> {
    if let Ok(mut unlocked) = session.is_unlocked.lock() {
        *unlocked = false;
    }
    Ok(())
}

#[tauri::command]
pub async fn remove_pin(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    current_pin: String,
) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    if data.security.is_pin_enabled {
        let salt = data.security.pin_salt.as_deref().unwrap_or_default();
        let expected_hash = data.security.pin_hash.as_deref().unwrap_or_default();
        if hash_pin(&current_pin, salt) != expected_hash {
            return Err("Invalid current PIN".to_string());
        }
    }

    data.security.is_pin_enabled = false;
    data.security.pin_hash = None;
    data.security.pin_salt = None;
    vault::save_data(&app, &data)?;

    if let Ok(mut unlocked) = session.is_unlocked.lock() {
        *unlocked = true;
    }

    Ok(())
}

#[tauri::command]
pub async fn change_pin(
    app: tauri::AppHandle,
    old_pin: String,
    new_pin: String,
) -> Result<(), String> {
    if new_pin.len() < 4 {
        return Err("New PIN must be at least 4 digits".to_string());
    }

    let mut data = vault::load_data(&app)?;
    if data.security.is_pin_enabled {
        let salt = data.security.pin_salt.as_deref().unwrap_or_default();
        let expected_hash = data.security.pin_hash.as_deref().unwrap_or_default();
        if hash_pin(&old_pin, salt) != expected_hash {
            return Err("Invalid current PIN".to_string());
        }
    }

    let new_salt = Uuid::new_v4().to_string();
    data.security.pin_salt = Some(new_salt.clone());
    data.security.pin_hash = Some(hash_pin(&new_pin, &new_salt));
    data.security.is_pin_enabled = true;
    vault::save_data(&app, &data)?;

    Ok(())
}

#[tauri::command]
pub async fn update_security_settings(
    app: tauri::AppHandle,
    auto_lock_timeout_secs: u64,
    lock_on_background: bool,
    biometric_enabled: bool,
    clipboard_clear_secs: u64,
) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    data.security.auto_lock_timeout_secs = auto_lock_timeout_secs;
    data.security.lock_on_background = lock_on_background;
    data.security.biometric_enabled = biometric_enabled;
    data.security.clipboard_clear_secs = clipboard_clear_secs;
    vault::save_data(&app, &data)?;
    Ok(())
}

#[tauri::command]
pub async fn check_system_time() -> Result<TimeDriftDto, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post("https://api.steampowered.com/ITwoFactorService/QueryTime/v1")
        .form(&[("steamid", "0")])
        .send()
        .await;

    match res {
        Ok(resp) => {
            if let Ok(body) = resp.json::<SteamTimeResponse>().await {
                if let Ok(server_time) = body.response.server_time.parse::<i64>() {
                    let drift = server_time - now;
                    let is_drift_detected = drift.abs() > 15;
                    return Ok(TimeDriftDto {
                        local_time: now,
                        server_time,
                        drift_seconds: drift,
                        is_drift_detected,
                    });
                }
            }
            Ok(TimeDriftDto {
                local_time: now,
                server_time: now,
                drift_seconds: 0,
                is_drift_detected: false,
            })
        }
        Err(_) => Ok(TimeDriftDto {
            local_time: now,
            server_time: now,
            drift_seconds: 0,
            is_drift_detected: false,
        }),
    }
}

#[tauri::command]
pub async fn export_encrypted_vault(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    passphrase: String,
) -> Result<String, String> {
    let data = vault::load_data(&app)?;
    if data.security.is_pin_enabled {
        let is_unlocked = *session.is_unlocked.lock().map_err(|e| e.to_string())?;
        if !is_unlocked {
            return Err("Vault is locked. Please unlock first.".to_string());
        }
    }

    crate::storage::backup::export_encrypted_vault_data(&data, &passphrase)
}

#[tauri::command]
pub async fn import_encrypted_vault(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    passphrase: String,
    backup_payload: String,
    merge: bool,
) -> Result<crate::storage::backup::BackupRestoreSummary, String> {
    let restored = crate::storage::backup::import_encrypted_vault_data(&passphrase, &backup_payload)?;

    let mut current_data = vault::load_data(&app)?;

    let steam_restored = restored.steam_accounts.len();
    let totp_restored = restored.totp_accounts.len();

    if merge {
        for acc in restored.steam_accounts {
            if !current_data.steam_accounts.iter().any(|a| a.steam_id == acc.steam_id) {
                current_data.steam_accounts.push(acc);
            }
        }
        for acc in restored.totp_accounts {
            if !current_data.totp_accounts.iter().any(|a| a.id == acc.id || (a.issuer == acc.issuer && a.label == acc.label)) {
                current_data.totp_accounts.push(acc);
            }
        }
    } else {
        current_data.steam_accounts = restored.steam_accounts;
        current_data.totp_accounts = restored.totp_accounts;
    }

    vault::save_data(&app, &current_data)?;

    if let Ok(mut unlocked) = session.is_unlocked.lock() {
        *unlocked = true;
    }

    Ok(crate::storage::backup::BackupRestoreSummary {
        steam_restored,
        totp_restored,
        total_accounts: current_data.steam_accounts.len() + current_data.totp_accounts.len(),
    })
}

