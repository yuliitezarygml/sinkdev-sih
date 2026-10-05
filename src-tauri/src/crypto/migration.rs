use base64::{engine::general_purpose::STANDARD as b64, Engine as _};
use reqwest::Url;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::storage::vault::TotpAccount;

fn read_varint(bytes: &[u8], pos: &mut usize) -> Result<u64, String> {
    let mut result = 0u64;
    let mut shift = 0;
    while *pos < bytes.len() {
        let b = bytes[*pos];
        *pos += 1;
        result |= ((b & 0x7F) as u64) << shift;
        if (b & 0x80) == 0 {
            return Ok(result);
        }
        shift += 7;
        if shift > 64 {
            return Err("Varint overflow".to_string());
        }
    }
    Err("Unexpected EOF reading varint".to_string())
}

fn skip_field(wire_type: u64, bytes: &[u8], pos: &mut usize) -> Result<(), String> {
    match wire_type {
        0 => {
            read_varint(bytes, pos)?;
            Ok(())
        }
        1 => {
            if *pos + 8 > bytes.len() {
                return Err("Unexpected EOF in 64-bit field".to_string());
            }
            *pos += 8;
            Ok(())
        }
        2 => {
            let len = read_varint(bytes, pos)? as usize;
            if *pos + len > bytes.len() {
                return Err("Unexpected EOF in length-delimited field".to_string());
            }
            *pos += len;
            Ok(())
        }
        5 => {
            if *pos + 4 > bytes.len() {
                return Err("Unexpected EOF in 32-bit field".to_string());
            }
            *pos += 4;
            Ok(())
        }
        _ => Err(format!("Unsupported wire type: {}", wire_type)),
    }
}

fn parse_otp_parameters(bytes: &[u8], added_at: u64) -> Result<Option<TotpAccount>, String> {
    let mut pos = 0;
    let mut secret = String::new();
    let mut name = String::new();
    let mut issuer = String::new();
    let mut algorithm = "SHA1".to_string();
    let mut digits = 6u32;
    let period = 30u64;
    let mut is_totp = true;

    while pos < bytes.len() {
        let tag = read_varint(bytes, &mut pos)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;

        match (field_num, wire_type) {
            (1, 2) => {
                let len = read_varint(bytes, &mut pos)? as usize;
                if pos + len > bytes.len() {
                    return Err("EOF in secret".to_string());
                }
                let raw_secret = &bytes[pos..pos + len];
                pos += len;
                secret = data_encoding::BASE32_NOPAD.encode(raw_secret);
            }
            (2, 2) => {
                let len = read_varint(bytes, &mut pos)? as usize;
                if pos + len > bytes.len() {
                    return Err("EOF in name".to_string());
                }
                name = String::from_utf8_lossy(&bytes[pos..pos + len]).to_string();
                pos += len;
            }
            (3, 2) => {
                let len = read_varint(bytes, &mut pos)? as usize;
                if pos + len > bytes.len() {
                    return Err("EOF in issuer".to_string());
                }
                issuer = String::from_utf8_lossy(&bytes[pos..pos + len]).to_string();
                pos += len;
            }
            (4, 0) => {
                let val = read_varint(bytes, &mut pos)?;
                algorithm = match val {
                    2 => "SHA256".to_string(),
                    3 => "SHA512".to_string(),
                    _ => "SHA1".to_string(),
                };
            }
            (5, 0) => {
                let val = read_varint(bytes, &mut pos)?;
                digits = match val {
                    2 => 8,
                    _ => 6,
                };
            }
            (6, 0) => {
                let val = read_varint(bytes, &mut pos)?;
                // 1 = HOTP, 2 = TOTP
                if val == 1 {
                    is_totp = false;
                }
            }
            _ => {
                skip_field(wire_type, bytes, &mut pos)?;
            }
        }
    }

    if !is_totp || secret.is_empty() {
        return Ok(None);
    }

    // Split name into issuer:label if issuer is empty
    let (final_issuer, final_label) = if issuer.is_empty() {
        if let Some((iss, lbl)) = name.split_once(':') {
            (iss.trim().to_string(), lbl.trim().to_string())
        } else {
            ("Unknown".to_string(), name)
        }
    } else {
        let clean_label = if let Some((_, lbl)) = name.split_once(':') {
            lbl.trim().to_string()
        } else {
            name
        };
        (issuer, clean_label)
    };

    Ok(Some(TotpAccount {
        id: Uuid::new_v4().to_string(),
        issuer: final_issuer,
        label: final_label,
        secret,
        algorithm,
        digits,
        period,
        icon: None,
        added_at,
    }))
}

/// Parses an otpauth-migration:// URI from Google Authenticator
pub fn parse_google_authenticator_migration(uri: &str) -> Result<Vec<TotpAccount>, String> {
    let url = Url::parse(uri).map_err(|e| format!("Invalid migration URI: {}", e))?;
    if url.scheme() != "otpauth-migration" {
        return Err("Scheme must be otpauth-migration".to_string());
    }

    let mut data_param = None;
    for (k, v) in url.query_pairs() {
        if k == "data" {
            data_param = Some(v.into_owned());
            break;
        }
    }

    let raw_b64 = data_param.ok_or_else(|| "Missing 'data' query parameter".to_string())?;
    let payload_bytes = b64.decode(raw_b64.trim())
        .map_err(|e| format!("Failed to decode base64 migration payload: {}", e))?;

    let mut pos = 0;
    let mut accounts = Vec::new();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    while pos < payload_bytes.len() {
        let tag = read_varint(&payload_bytes, &mut pos)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;

        if field_num == 1 && wire_type == 2 {
            let len = read_varint(&payload_bytes, &mut pos)? as usize;
            if pos + len > payload_bytes.len() {
                return Err("EOF in otp_parameters field".to_string());
            }
            let param_bytes = &payload_bytes[pos..pos + len];
            pos += len;
            if let Some(acc) = parse_otp_parameters(param_bytes, now)? {
                accounts.push(acc);
            }
        } else {
            skip_field(wire_type, &payload_bytes, &mut pos)?;
        }
    }

    Ok(accounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_google_migration_payload() {
        // Construct a valid Google Authenticator migration payload protobuf manually
        // OtpParameters:
        // field 1 (secret): "12345678901234567890" (20 bytes)
        // field 2 (name): "Google:test@gmail.com"
        // field 3 (issuer): "Google"
        // field 4 (algo): 1 (SHA1)
        // field 5 (digits): 1 (6)
        // field 6 (type): 2 (TOTP)

        let mut param = Vec::new();
        // field 1: secret
        param.push((1 << 3) | 2);
        let secret_bytes = b"12345678901234567890";
        param.push(secret_bytes.len() as u8);
        param.extend_from_slice(secret_bytes);

        // field 2: name
        param.push((2 << 3) | 2);
        let name_bytes = b"Google:test@gmail.com";
        param.push(name_bytes.len() as u8);
        param.extend_from_slice(name_bytes);

        // field 3: issuer
        param.push((3 << 3) | 2);
        let issuer_bytes = b"Google";
        param.push(issuer_bytes.len() as u8);
        param.extend_from_slice(issuer_bytes);

        // field 4: algo = 1
        param.push((4 << 3) | 0);
        param.push(1);

        // field 5: digits = 1
        param.push((5 << 3) | 0);
        param.push(1);

        // field 6: type = 2
        param.push((6 << 3) | 0);
        param.push(2);

        // Top level MigrationPayload:
        // field 1 (otp_parameters, wire 2)
        let mut payload = Vec::new();
        payload.push((1 << 3) | 2);
        payload.push(param.len() as u8);
        payload.extend_from_slice(&param);

        let encoded_b64 = b64.encode(&payload);
        let uri = format!("otpauth-migration://offline?data={}", urlencoding::encode(&encoded_b64));

        let parsed = parse_google_authenticator_migration(&uri).expect("Should parse successfully");
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].issuer, "Google");
        assert_eq!(parsed[0].label, "test@gmail.com");
        assert_eq!(parsed[0].digits, 6);
        assert_eq!(parsed[0].algorithm, "SHA1");
        assert!(!parsed[0].secret.is_empty());
    }
}
