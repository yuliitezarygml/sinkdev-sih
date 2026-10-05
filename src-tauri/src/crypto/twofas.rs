use serde::Deserialize;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::storage::vault::TotpAccount;
use reqwest::Url;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct TwoFasBackup {
    pub services: Option<Vec<TwoFasService>>,
    #[serde(rename = "schemaVersion")]
    pub schema_version: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct TwoFasService {
    pub name: Option<String>,
    pub secret: Option<String>,
    pub otp: Option<TwoFasOtp>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct TwoFasOtp {
    pub link: Option<String>,
    pub label: Option<String>,
    pub account: Option<String>,
    pub issuer: Option<String>,
    pub digits: Option<u32>,
    pub period: Option<u64>,
    pub algorithm: Option<String>,
    #[serde(rename = "tokenType")]
    pub token_type: Option<String>,
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub fn parse_2fas_backup(content: &str) -> Result<Vec<TotpAccount>, String> {
    let backup: TwoFasBackup = serde_json::from_str(content)
        .map_err(|e| format!("Failed to parse 2FAS backup JSON: {}", e))?;

    let services = backup.services.ok_or_else(|| "2FAS backup contains no services array".to_string())?;
    let mut accounts = Vec::new();

    for service in services {
        let mut secret = service.secret.unwrap_or_default();
        let otp = service.otp.unwrap_or(TwoFasOtp {
            link: None,
            label: None,
            account: None,
            issuer: None,
            digits: None,
            period: None,
            algorithm: None,
            token_type: None,
        });

        // If secret was not directly on service, try extracting from otp.link
        if secret.trim().is_empty() {
            if let Some(ref link) = otp.link {
                if let Ok(url) = Url::parse(link) {
                    for (k, v) in url.query_pairs() {
                        if k == "secret" {
                            secret = v.to_string();
                            break;
                        }
                    }
                }
            }
        }

        // Clean secret
        let clean_secret = secret.replace(' ', "").to_uppercase();
        let clean_secret = clean_secret.trim_end_matches('=').to_string();

        if clean_secret.is_empty() {
            continue;
        }

        let service_name = service.name.unwrap_or_default();

        let issuer = otp.issuer
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| {
                if !service_name.trim().is_empty() {
                    service_name.clone()
                } else {
                    "2FA".to_string()
                }
            });

        let label = otp.label
            .filter(|s| !s.trim().is_empty())
            .or_else(|| otp.account.filter(|s| !s.trim().is_empty()))
            .unwrap_or_else(|| {
                if !service_name.trim().is_empty() {
                    service_name
                } else {
                    "Account".to_string()
                }
            });

        let digits = otp.digits.unwrap_or(6);
        let period = otp.period.unwrap_or(30);

        let algorithm = match otp.algorithm.as_deref().unwrap_or("SHA1").to_uppercase().as_str() {
            "SHA256" => "SHA256".to_string(),
            "SHA512" => "SHA512".to_string(),
            _ => "SHA1".to_string(),
        };

        let added_at = service.updated_at.map(|ms| ms / 1000).unwrap_or_else(current_timestamp);

        accounts.push(TotpAccount {
            id: Uuid::new_v4().to_string(),
            issuer: issuer.trim().to_string(),
            label: label.trim().to_string(),
            secret: clean_secret,
            algorithm,
            digits,
            period,
            icon: None,
            added_at,
        });
    }

    Ok(accounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_2fas_backup_minimal() {
        let json = r#"{
            "schemaVersion": 4,
            "services": [
                {
                    "name": "GitHub",
                    "secret": "JBSWY3DPEHPK3PXP",
                    "otp": {
                        "issuer": "GitHub",
                        "label": "user@example.com",
                        "digits": 6,
                        "period": 30,
                        "algorithm": "SHA1"
                    }
                },
                {
                    "name": "Discord",
                    "secret": "4S62BZNFXXSZLCRO",
                    "otp": {
                        "account": "discuser"
                    }
                }
            ]
        }"#;

        let accounts = parse_2fas_backup(json).expect("should parse 2fas");
        assert_eq!(accounts.len(), 2);
        assert_eq!(accounts[0].issuer, "GitHub");
        assert_eq!(accounts[0].label, "user@example.com");
        assert_eq!(accounts[0].secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(accounts[0].digits, 6);
        assert_eq!(accounts[0].period, 30);
        assert_eq!(accounts[1].issuer, "Discord");
        assert_eq!(accounts[1].label, "discuser");
    }
}
