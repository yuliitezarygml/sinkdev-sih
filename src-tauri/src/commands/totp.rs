use crate::crypto::totp::{self, Algorithm};
use crate::storage::vault::{self, to_totp_dto, TotpAccount, TotpAccountDto, VaultSession};
use crate::commands::steam::CodeResult;
use reqwest::Url;
use std::collections::HashMap;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub async fn generate_totp_code(secret: String, digits: u32, period: u64, algorithm: String) -> Result<CodeResult, String> {
    let algo = match algorithm.to_uppercase().as_str() {
        "SHA1" => Algorithm::SHA1,
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => return Err("Unsupported algorithm".to_string()),
    };
    
    let code = totp::generate_totp(&secret, digits, period, &algo)?;
    let seconds_left = totp::seconds_until_totp_change(period);
    
    Ok(CodeResult { code, seconds_left })
}

#[tauri::command]
pub async fn get_totp_account_code(
    app: tauri::AppHandle,
    id: String,
) -> Result<CodeResult, String> {
    let data = vault::load_data(&app)?;
    let account = data.totp_accounts.into_iter().find(|a| a.id == id)
        .ok_or_else(|| "TOTP account not found".to_string())?;

    let algo = match account.algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    let code = totp::generate_totp(&account.secret, account.digits, account.period, &algo)?;
    let seconds_left = totp::seconds_until_totp_change(account.period);

    Ok(CodeResult { code, seconds_left })
}

#[tauri::command]
pub async fn import_google_migration(
    app: tauri::AppHandle,
    uri: String,
) -> Result<Vec<TotpAccountDto>, String> {
    let accounts = crate::crypto::migration::parse_google_authenticator_migration(&uri)?;
    if accounts.is_empty() {
        return Err("No accounts found in migration URI".to_string());
    }

    let mut data = vault::load_data(&app)?;
    let mut added_dtos = Vec::new();

    for acc in accounts {
        if !data.totp_accounts.iter().any(|existing| existing.secret == acc.secret) {
            added_dtos.push(to_totp_dto(&acc));
            data.totp_accounts.push(acc);
        }
    }

    vault::save_data(&app, &data)?;
    Ok(added_dtos)
}

#[tauri::command]
pub async fn parse_otpauth_uri(app: tauri::AppHandle, uri: String) -> Result<TotpAccountDto, String> {
    let trimmed = uri.trim();
    if trimmed.starts_with("otpauth-migration:") {
        let imported = import_google_migration(app, trimmed.to_string()).await?;
        return imported.into_iter().next().ok_or_else(|| "No accounts imported".to_string());
    }

    let url = Url::parse(trimmed).map_err(|e| e.to_string())?;
    
    if url.scheme() != "otpauth" || url.host_str() != Some("totp") {
        return Err("Invalid otpauth URI".to_string());
    }
    
    let path = url.path().trim_start_matches('/');
    let mut label_parts = path.splitn(2, ':');
    let mut issuer = label_parts.next().unwrap_or("").to_string();
    let label = label_parts.next().unwrap_or(path).to_string();
    
    let mut query_pairs: HashMap<String, String> = url.query_pairs().into_owned().collect();
    
    let secret = query_pairs.remove("secret").ok_or("Secret missing")?;
    
    if let Some(iss) = query_pairs.get("issuer") {
        if issuer.is_empty() || issuer == path {
            issuer = iss.clone();
        }
    }
    
    let algorithm = query_pairs.get("algorithm").cloned().unwrap_or_else(|| "SHA1".to_string());
    
    let digits = query_pairs.get("digits")
        .and_then(|d| d.parse::<u32>().ok())
        .unwrap_or(6);
        
    let period = query_pairs.get("period")
        .and_then(|p| p.parse::<u64>().ok())
        .unwrap_or(30);
        
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        
    let account = TotpAccount {
        id: Uuid::new_v4().to_string(),
        issuer: urlencoding::decode(&issuer).unwrap_or(std::borrow::Cow::Borrowed(&issuer)).to_string(),
        label: urlencoding::decode(&label).unwrap_or(std::borrow::Cow::Borrowed(&label)).to_string(),
        secret,
        algorithm,
        digits,
        period,
        icon: None,
        added_at: time,
    };

    Ok(to_totp_dto(&account))
}

#[tauri::command]
pub async fn add_totp_account(
    app: tauri::AppHandle,
    issuer: String,
    label: String,
    secret: String,
    algorithm: String,
    digits: u32,
    period: u64,
) -> Result<TotpAccountDto, String> {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    
    let account = TotpAccount {
        id: Uuid::new_v4().to_string(),
        issuer,
        label,
        secret,
        algorithm,
        digits,
        period,
        icon: None,
        added_at: time,
    };
    
    let mut data = vault::load_data(&app)?;
    data.totp_accounts.push(account.clone());
    vault::save_data(&app, &data)?;
    
    Ok(to_totp_dto(&account))
}

#[tauri::command]
pub async fn get_totp_accounts(
    app: tauri::AppHandle,
    session: tauri::State<'_, VaultSession>,
) -> Result<Vec<TotpAccountDto>, String> {
    let data = vault::load_data(&app)?;

    if data.security.is_pin_enabled {
        let is_unlocked = *session.is_unlocked.lock().map_err(|e| e.to_string())?;
        if !is_unlocked {
            return Err("Vault is locked".to_string());
        }
    }

    let dtos = data.totp_accounts
        .iter()
        .map(to_totp_dto)
        .collect();

    Ok(dtos)
}

#[tauri::command]
pub async fn rename_totp_account(
    app: tauri::AppHandle,
    id: String,
    new_issuer: String,
    new_label: String,
) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    if let Some(acc) = data.totp_accounts.iter_mut().find(|a| a.id == id) {
        acc.issuer = new_issuer;
        acc.label = new_label;
        vault::save_data(&app, &data)?;
        Ok(())
    } else {
        Err("Account not found".to_string())
    }
}

#[tauri::command]
pub async fn remove_totp_account(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut data = vault::load_data(&app)?;
    data.totp_accounts.retain(|acc| acc.id != id);
    vault::save_data(&app, &data)?;
    Ok(())
}
