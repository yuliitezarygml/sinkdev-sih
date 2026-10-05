use base64::{engine::general_purpose::STANDARD as b64, Engine as _};
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue, COOKIE, USER_AGENT};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha1 = Hmac<Sha1>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Confirmation {
    pub id: String,
    pub nonce: String,
    pub creator_id: String,
    pub headline: String,
    pub summary: Vec<String>,
    pub icon: String,
    pub conf_type: u32,
    pub time_str: String,
}

#[derive(Deserialize)]
struct RawConfirmation {
    id: String,
    nonce: String,
    #[serde(default)]
    creator_id: Option<serde_json::Value>,
    #[serde(default)]
    headline: Option<String>,
    #[serde(default)]
    summary: Option<Vec<String>>,
    #[serde(default)]
    icon: Option<String>,
    #[serde(rename = "type", default)]
    conf_type: Option<u32>,
    #[serde(default)]
    time: Option<String>,
}

#[derive(Deserialize)]
struct ConfirmationResponse {
    success: bool,
    #[serde(default)]
    conf: Option<Vec<RawConfirmation>>,
    #[serde(default)]
    message: Option<String>,
}

#[derive(Deserialize)]
struct AjaxOpResponse {
    success: bool,
    #[serde(default)]
    message: Option<String>,
}

#[derive(Deserialize)]
struct TransferInfo {
    url: String,
    params: HashMap<String, String>,
}

#[derive(Deserialize)]
struct FinalizeLoginResponse {
    #[serde(default)]
    steam_id: Option<String>,
    #[serde(rename = "steamID", default)]
    steam_id_alt: Option<String>,
    #[serde(default)]
    transfer_info: Vec<TransferInfo>,
}

/// Generates confirmation key (HMAC-SHA1 of time bytes + tag)
pub fn generate_confirmation_key(
    identity_secret_b64: &str,
    time: u64,
    tag: &str,
) -> Result<String, String> {
    let secret = b64.decode(identity_secret_b64).map_err(|e| format!("Invalid identity_secret: {}", e))?;
    
    let mut data = Vec::with_capacity(8 + tag.len());
    data.extend_from_slice(&time.to_be_bytes());
    if !tag.is_empty() {
        data.extend_from_slice(tag.as_bytes());
    }

    let mut mac = HmacSha1::new_from_slice(&secret).map_err(|e| e.to_string())?;
    mac.update(&data);
    let hash = mac.finalize().into_bytes();

    Ok(b64.encode(hash))
}

/// Refreshes Steam session using OAuth RefreshToken to get a fresh steamLoginSecure cookie
pub async fn refresh_steam_session(
    refresh_token: &str,
    session_id: &str,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let params = [
        ("nonce", refresh_token),
        ("sessionid", session_id),
        ("redir", "https://steamcommunity.com/login/home/?goto="),
    ];

    let resp = client
        .post("https://login.steampowered.com/jwt/finalizelogin")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("finalizelogin request failed: {}", e))?;

    let finalize: FinalizeLoginResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse finalizelogin: {}", e))?;

    let comm_info = finalize
        .transfer_info
        .iter()
        .find(|t| t.url.contains("steamcommunity.com"))
        .ok_or_else(|| "steamcommunity.com not found in transfer_info".to_string())?;

    let steam_id = finalize.steam_id.or(finalize.steam_id_alt).unwrap_or_default();

    let mut set_params = Vec::new();
    for (k, v) in &comm_info.params {
        set_params.push((k.as_str(), v.as_str()));
    }
    set_params.push(("steamID", steam_id.as_str()));

    let set_resp = client
        .post(&comm_info.url)
        .form(&set_params)
        .send()
        .await
        .map_err(|e| format!("settoken request failed: {}", e))?;

    for header in set_resp.headers().get_all(reqwest::header::SET_COOKIE) {
        if let Ok(val) = header.to_str() {
            if let Some(pos) = val.find("steamLoginSecure=") {
                let rest = &val[pos + 17..];
                let end = rest.find(';').unwrap_or(rest.len());
                return Ok(rest[..end].to_string());
            }
        }
    }

    Err("steamLoginSecure cookie was not found in response".to_string())
}

/// Helper function to perform getlist HTTP call
async fn do_getlist(
    steam_id: &str,
    device_id: &str,
    identity_secret: &str,
    steam_login_secure: &str,
    session_id: &str,
    time_offset: i64,
) -> Result<Vec<Confirmation>, String> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let time = (now + time_offset) as u64;

    let key = generate_confirmation_key(identity_secret, time, "conf")?;

    let url = format!(
        "https://steamcommunity.com/mobileconf/getlist?p={}&a={}&k={}&t={}&m=android&tag=conf",
        urlencoding::encode(device_id),
        urlencoding::encode(steam_id),
        urlencoding::encode(&key),
        time
    );

    let cookie_header = format!(
        "steamLoginSecure={}; sessionid={}; mobileClientVersion=0%20(2.1.3); mobileClient=android",
        steam_login_secure, session_id
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        COOKIE,
        HeaderValue::from_str(&cookie_header).map_err(|e| e.to_string())?,
    );
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"),
    );

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| format!("Network request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Steam returned HTTP status {}", status));
    }

    let body = resp.text().await.map_err(|e| e.to_string())?;

    match serde_json::from_str::<ConfirmationResponse>(&body) {
        Ok(parsed) => {
            if !parsed.success {
                let msg = parsed.message.unwrap_or_else(|| "Steam session expired or invalid credentials".to_string());
                return Err(msg);
            }

            let raw_list = parsed.conf.unwrap_or_default();
            let mut list = Vec::new();
            for item in raw_list {
                let creator_id = match item.creator_id {
                    Some(serde_json::Value::Number(n)) => n.to_string(),
                    Some(serde_json::Value::String(s)) => s,
                    _ => String::new(),
                };

                list.push(Confirmation {
                    id: item.id,
                    nonce: item.nonce,
                    creator_id,
                    headline: item.headline.unwrap_or_else(|| "Trade / Market Listing".to_string()),
                    summary: item.summary.unwrap_or_default(),
                    icon: item.icon.unwrap_or_default(),
                    conf_type: item.conf_type.unwrap_or(2),
                    time_str: item.time.unwrap_or_default(),
                });
            }

            Ok(list)
        }
        Err(_) => {
            if body.contains("Sign In") || body.contains("login") {
                Err("Steam session expired or invalid credentials".to_string())
            } else {
                Err("Failed to parse Steam confirmations response.".to_string())
            }
        }
    }
}

pub async fn fetch_confirmations(
    steam_id: &str,
    device_id: &str,
    identity_secret: &str,
    steam_login_secure: &str,
    session_id: &str,
    refresh_token: Option<&str>,
    time_offset: i64,
) -> Result<(Vec<Confirmation>, Option<String>), String> {
    // 1. Try with existing cookie if available
    if !steam_login_secure.is_empty() {
        match do_getlist(steam_id, device_id, identity_secret, steam_login_secure, session_id, time_offset).await {
            Ok(list) => return Ok((list, None)),
            Err(e) => {
                // If it's not a session expiration error or we don't have a refresh_token, return the error
                if refresh_token.is_none() || !e.contains("session expired") && !e.contains("invalid credentials") {
                    return Err(e);
                }
            }
        }
    }

    // 2. Refresh session if refresh_token is available
    if let Some(rt) = refresh_token {
        let new_cookie = refresh_steam_session(rt, session_id).await?;
        let list = do_getlist(steam_id, device_id, identity_secret, &new_cookie, session_id, time_offset).await?;
        return Ok((list, Some(new_cookie)));
    }

    Err("Steam session is not configured. Please add steamLoginSecure cookie or import a maFile with RefreshToken.".to_string())
}

pub async fn respond_confirmation(
    steam_id: &str,
    device_id: &str,
    identity_secret: &str,
    steam_login_secure: &str,
    session_id: &str,
    conf_id: &str,
    conf_nonce: &str,
    accept: bool,
    time_offset: i64,
) -> Result<bool, String> {
    let tag = if accept { "allow" } else { "cancel" };
    let op = tag;

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let time = (now + time_offset) as u64;

    let key = generate_confirmation_key(identity_secret, time, tag)?;

    let url = format!(
        "https://steamcommunity.com/mobileconf/ajaxop?op={}&p={}&a={}&k={}&t={}&m=android&tag={}&cid={}&ck={}",
        op,
        urlencoding::encode(device_id),
        urlencoding::encode(steam_id),
        urlencoding::encode(&key),
        time,
        tag,
        urlencoding::encode(conf_id),
        urlencoding::encode(conf_nonce)
    );

    let cookie_header = format!(
        "steamLoginSecure={}; sessionid={}; mobileClientVersion=0%20(2.1.3); mobileClient=android",
        steam_login_secure, session_id
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        COOKIE,
        HeaderValue::from_str(&cookie_header).map_err(|e| e.to_string())?,
    );
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"),
    );

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| format!("Network request failed: {}", e))?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    match serde_json::from_str::<AjaxOpResponse>(&body) {
        Ok(parsed) => {
            if parsed.success {
                Ok(true)
            } else {
                Err(parsed.message.unwrap_or_else(|| "Failed to respond to confirmation".to_string()))
            }
        }
        Err(_) => {
            Err("Failed to parse Steam response".to_string())
        }
    }
}

#[derive(Deserialize)]
struct DetailsResponse {
    success: bool,
    #[serde(default)]
    html: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

pub async fn fetch_confirmation_details(
    steam_id: &str,
    device_id: &str,
    identity_secret: &str,
    steam_login_secure: &str,
    session_id: &str,
    conf_id: &str,
    time_offset: i64,
) -> Result<String, String> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let time = (now + time_offset) as u64;

    let key = generate_confirmation_key(identity_secret, time, "details")?;

    let url = format!(
        "https://steamcommunity.com/mobileconf/details/{}?p={}&a={}&k={}&t={}&m=android&tag=details",
        urlencoding::encode(conf_id),
        urlencoding::encode(device_id),
        urlencoding::encode(steam_id),
        urlencoding::encode(&key),
        time
    );

    let cookie_header = format!(
        "steamLoginSecure={}; sessionid={}; mobileClientVersion=0%20(2.1.3); mobileClient=android",
        steam_login_secure, session_id
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        COOKIE,
        HeaderValue::from_str(&cookie_header).map_err(|e| e.to_string())?,
    );
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"),
    );

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| format!("Network request failed: {}", e))?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    match serde_json::from_str::<DetailsResponse>(&body) {
        Ok(parsed) => {
            if parsed.success {
                Ok(parsed.html.unwrap_or_default())
            } else {
                Err(parsed.message.unwrap_or_else(|| "Failed to fetch confirmation details".to_string()))
            }
        }
        Err(_) => {
            Err("Failed to parse Steam details response".to_string())
        }
    }
}

