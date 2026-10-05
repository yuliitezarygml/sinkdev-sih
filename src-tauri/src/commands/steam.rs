use serde::{Deserialize, Serialize};
use crate::crypto::steam_totp;
use crate::steam::{confirmations::{self, Confirmation}, mafile};
use crate::storage::vault::{self, to_steam_dto, SteamAccount, SteamAccountDto, VaultSession};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct CodeResult {
    pub code: String,
    pub seconds_left: u64,
}

#[tauri::command]
pub async fn generate_steam_guard_code(shared_secret: String, time_offset: i64) -> Result<CodeResult, String> {
    let code = steam_totp::generate_steam_code(&shared_secret, time_offset)?;
    let seconds_left = steam_totp::seconds_until_change(time_offset);
    Ok(CodeResult { code, seconds_left })
}

#[tauri::command]
pub async fn get_steam_account_code(
    app: tauri::AppHandle,
    id: String,
    time_offset: Option<i64>,
) -> Result<CodeResult, String> {
    let data = vault::load_data(&app)?;
    let account = data.steam_accounts.into_iter().find(|a| a.id == id)
        .ok_or_else(|| "Steam account not found".to_string())?;

    let offset = time_offset.unwrap_or(0);
    let code = steam_totp::generate_steam_code(&account.shared_secret, offset)?;
    let seconds_left = steam_totp::seconds_until_change(offset);
    Ok(CodeResult { code, seconds_left })
}

#[tauri::command]
pub async fn import_mafile(app: tauri::AppHandle, content: String) -> Result<SteamAccountDto, String> {
    let account = mafile::parse_mafile(&content)?;
    
    let mut data = vault::load_data(&app)?;
    // Replace if already exists with same steam_id or add new
    data.steam_accounts.retain(|a| a.steam_id != account.steam_id);
    data.steam_accounts.push(account.clone());
    vault::save_data(&app, &data)?;
    
    Ok(to_steam_dto(&account, 0))
}

#[tauri::command]
pub async fn add_steam_account(
    app: tauri::AppHandle,
    account_name: String,
    steam_id: String,
    shared_secret: String,
    identity_secret: String,
    revocation_code: String,
) -> Result<SteamAccountDto, String> {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    
    let account = SteamAccount {
        id: Uuid::new_v4().to_string(),
        account_name,
        steam_id,
        shared_secret,
        identity_secret,
        revocation_code,
        device_id: format!("android:{}", Uuid::new_v4()),
        session_id: None,
        steam_login_secure: None,
        refresh_token: None,
        added_at: time,
    };
    
    let mut data = vault::load_data(&app)?;
    data.steam_accounts.push(account.clone());
    vault::save_data(&app, &data)?;
    
    Ok(to_steam_dto(&account, 0))
}

#[tauri::command]
pub async fn get_steam_accounts(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
    time_offset: Option<i64>,
) -> Result<Vec<SteamAccountDto>, String> {
    let data = vault::load_data(&app)?;

    // Check lock state if PIN is enabled
    if data.security.is_pin_enabled {
        let is_unlocked = *session.is_unlocked.lock().map_err(|e| e.to_string())?;
        if !is_unlocked {
            return Err("Vault is locked".to_string());
        }
    }

    let offset = time_offset.unwrap_or(0);
    let dtos = data.steam_accounts
        .iter()
        .map(|acc| to_steam_dto(acc, offset))
        .collect();

    Ok(dtos)
}

#[tauri::command]
pub async fn rename_steam_account(
    app: tauri::AppHandle,
    id: String,
    new_name: String,
) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    if let Some(acc) = data.steam_accounts.iter_mut().find(|a| a.id == id) {
        acc.account_name = new_name;
        vault::save_data(&app, &data)?;
        Ok(())
    } else {
        Err("Account not found".to_string())
    }
}

#[tauri::command]
pub async fn remove_steam_account(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    data.steam_accounts.retain(|acc| acc.id != id);
    vault::save_data(&app, &data)?;
    Ok(())
}

#[tauri::command]
pub async fn update_steam_session(
    app: tauri::AppHandle,
    account_id: String,
    session_id: String,
    steam_login_secure: String,
) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    if let Some(acc) = data.steam_accounts.iter_mut().find(|a| a.id == account_id) {
        acc.session_id = Some(session_id);
        acc.steam_login_secure = Some(steam_login_secure);
        vault::save_data(&app, &data)?;
        Ok(())
    } else {
        Err("Account not found".to_string())
    }
}

#[tauri::command]
pub async fn get_steam_confirmations(
    app: tauri::AppHandle,
    account_id: String,
    time_offset: i64,
) -> Result<Vec<Confirmation>, String> {
    let mut data = vault::load_data(&app)?;
    let (account_idx, account) = data
        .steam_accounts
        .iter()
        .enumerate()
        .find(|(_, a)| a.id == account_id)
        .map(|(i, a)| (i, a.clone()))
        .ok_or_else(|| "Steam account not found".to_string())?;

    let steam_login_secure = account.steam_login_secure.unwrap_or_default();
    let session_id = account.session_id.unwrap_or_default();
    let refresh_token = account.refresh_token.as_deref();

    let (list, new_cookie) = confirmations::fetch_confirmations(
        &account.steam_id,
        &account.device_id,
        &account.identity_secret,
        &steam_login_secure,
        &session_id,
        refresh_token,
        time_offset,
    ).await?;

    if let Some(cookie) = new_cookie {
        data.steam_accounts[account_idx].steam_login_secure = Some(cookie);
        let _ = vault::save_data(&app, &data);
    }

    Ok(list)
}

#[tauri::command]
pub async fn respond_steam_confirmation(
    app: tauri::AppHandle,
    account_id: String,
    conf_id: String,
    conf_nonce: String,
    accept: bool,
    time_offset: i64,
) -> Result<bool, String> {
    let data = vault::load_data(&app)?;
    let account = data.steam_accounts.into_iter().find(|a| a.id == account_id)
        .ok_or_else(|| "Steam account not found".to_string())?;

    let steam_login_secure = account.steam_login_secure.unwrap_or_default();
    let session_id = account.session_id.unwrap_or_default();

    confirmations::respond_confirmation(
        &account.steam_id,
        &account.device_id,
        &account.identity_secret,
        &steam_login_secure,
        &session_id,
        &conf_id,
        &conf_nonce,
        accept,
        time_offset,
    ).await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BatchImportResult {
    pub imported: usize,
    pub failed: usize,
    pub account_names: Vec<String>,
}

#[tauri::command]
pub async fn import_batch_mafiles(
    app: tauri::AppHandle,
    contents: Vec<String>,
) -> Result<BatchImportResult, String> {
    let mut data = vault::load_data(&app)?;
    let mut imported = 0;
    let mut failed = 0;
    let mut account_names = Vec::new();

    for content in contents {
        match mafile::parse_mafile(&content) {
            Ok(account) => {
                account_names.push(account.account_name.clone());
                data.steam_accounts.retain(|a| a.steam_id != account.steam_id);
                data.steam_accounts.push(account);
                imported += 1;
            }
            Err(_) => {
                failed += 1;
            }
        }
    }

    if imported > 0 {
        vault::save_data(&app, &data)?;
    }

    Ok(BatchImportResult {
        imported,
        failed,
        account_names,
    })
}

#[tauri::command]
pub async fn get_steam_confirmation_details(
    app: tauri::AppHandle,
    account_id: String,
    conf_id: String,
    time_offset: i64,
) -> Result<String, String> {
    let data = vault::load_data(&app)?;
    let account = data.steam_accounts.into_iter().find(|a| a.id == account_id)
        .ok_or_else(|| "Steam account not found".to_string())?;

    let steam_login_secure = account.steam_login_secure.unwrap_or_default();
    let session_id = account.session_id.unwrap_or_default();

    if steam_login_secure.is_empty() {
        return Err("No active session cookie found".to_string());
    }

    confirmations::fetch_confirmation_details(
        &account.steam_id,
        &account.device_id,
        &account.identity_secret,
        &steam_login_secure,
        &session_id,
        &conf_id,
        time_offset,
    ).await
}


