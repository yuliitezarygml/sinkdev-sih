use crate::storage::vault::SteamAccount;
use serde::Deserialize;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Deserialize, Default)]
struct MaFileSession {
    #[serde(rename = "SteamID", default)]
    steam_id: Option<serde_json::Value>,
    #[serde(rename = "SessionID", default)]
    session_id: Option<String>,
    #[serde(rename = "SteamLoginSecure", default)]
    steam_login_secure: Option<String>,
    #[serde(rename = "RefreshToken", default)]
    refresh_token: Option<String>,
}

#[derive(Deserialize)]
struct MaFile {
    #[serde(default)]
    shared_secret: Option<String>,
    #[serde(default)]
    revocation_code: Option<String>,
    #[serde(default)]
    account_name: Option<String>,
    #[serde(default)]
    identity_secret: Option<String>,
    #[serde(default)]
    device_id: Option<String>,
    #[serde(default)]
    steamid: Option<serde_json::Value>,
    #[serde(rename = "Session", default)]
    session: Option<MaFileSession>,
}

pub fn parse_mafile(content: &str) -> Result<SteamAccount, String> {
    let mafile: MaFile = serde_json::from_str(content)
        .map_err(|e| format!("Failed to parse maFile JSON: {}", e))?;

    let shared_secret = mafile.shared_secret
        .ok_or_else(|| "maFile is missing 'shared_secret'".to_string())?;

    let identity_secret = mafile.identity_secret.unwrap_or_default();
    let account_name = mafile.account_name.unwrap_or_else(|| "Steam Account".to_string());
    let revocation_code = mafile.revocation_code.unwrap_or_default();
    let device_id = mafile.device_id.unwrap_or_else(|| format!("android:{}", Uuid::new_v4()));

    // Try extracting SteamID
    let mut steam_id = String::new();
    if let Some(session) = &mafile.session {
        if let Some(val) = &session.steam_id {
            steam_id = match val {
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            };
        }
    }
    if steam_id.is_empty() {
        if let Some(val) = &mafile.steamid {
            steam_id = match val {
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            };
        }
    }

    let session_id = mafile.session.as_ref().and_then(|s| s.session_id.clone());
    let steam_login_secure = mafile.session.as_ref().and_then(|s| s.steam_login_secure.clone());
    let refresh_token = mafile.session.as_ref().and_then(|s| s.refresh_token.clone());

    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(SteamAccount {
        id: Uuid::new_v4().to_string(),
        account_name,
        steam_id,
        shared_secret,
        identity_secret,
        revocation_code,
        device_id,
        session_id,
        steam_login_secure,
        refresh_token,
        added_at: time,
    })
}
