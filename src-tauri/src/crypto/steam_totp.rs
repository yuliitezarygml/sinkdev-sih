use hmac::{Hmac, Mac};
use sha1::Sha1;
use std::time::{SystemTime, UNIX_EPOCH};
use base64::{Engine as _, engine::general_purpose::STANDARD as b64};

type HmacSha1 = Hmac<Sha1>;

const ALPHABET: &[u8] = b"23456789BCDFGHJKMNPQRTVWXY";

pub fn generate_steam_code(shared_secret_b64: &str, time_offset: i64) -> Result<String, String> {
    let secret = b64.decode(shared_secret_b64).map_err(|e| e.to_string())?;
    
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let time = (time + time_offset) as u64;
    let time_step = time / 30;
    
    let mut time_bytes = [0u8; 8];
    for i in 0..8 {
        time_bytes[7 - i] = ((time_step >> (i * 8)) & 0xFF) as u8;
    }
    
    let mut mac = HmacSha1::new_from_slice(&secret).map_err(|e| e.to_string())?;
    mac.update(&time_bytes);
    let result = mac.finalize().into_bytes();
    
    let offset = (result[19] & 0x0f) as usize;
    let mut code_int = ((result[offset] as u32 & 0x7f) << 24)
        | ((result[offset + 1] as u32 & 0xff) << 16)
        | ((result[offset + 2] as u32 & 0xff) << 8)
        | (result[offset + 3] as u32 & 0xff);
        
    let mut code = String::new();
    for _ in 0..5 {
        code.push(ALPHABET[(code_int % 26) as usize] as char);
        code_int /= 26;
    }
    
    Ok(code)
}

pub fn seconds_until_change(time_offset: i64) -> u64 {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let time = (time + time_offset) as u64;
    30 - (time % 30)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_steam_code_generation() {
        // Test base64 shared_secret
        let secret = "kR6pW5d+YgN4fQ==";
        let code = generate_steam_code(secret, 0).expect("should generate code");
        assert_eq!(code.len(), 5);
        for c in code.chars() {
            assert!(ALPHABET.contains(&(c as u8)), "Character {} not in Steam alphabet", c);
        }
    }

    #[test]
    fn test_steam_code_invalid_secret() {
        let res = generate_steam_code("not a valid base64!", 0);
        assert!(res.is_err());
    }
}

