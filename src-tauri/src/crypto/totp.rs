use hmac::{Hmac, Mac};
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};
use data_encoding::BASE32_NOPAD;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Algorithm {
    SHA1,
    SHA256,
    SHA512,
}

pub fn generate_totp(secret_b32: &str, digits: u32, period: u64, algorithm: &Algorithm) -> Result<String, String> {
    // some libs encode base32 with padding, some without. Try both.
    let mut secret_b32_clean = secret_b32.to_uppercase().replace(" ", "");
    // Remove padding if any
    secret_b32_clean = secret_b32_clean.trim_end_matches('=').to_string();
    
    let secret = BASE32_NOPAD.decode(secret_b32_clean.as_bytes()).map_err(|e| e.to_string())?;
    
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let time_step = time / period;
    
    let mut time_bytes = [0u8; 8];
    for i in 0..8 {
        time_bytes[7 - i] = ((time_step >> (i * 8)) & 0xFF) as u8;
    }
    
    let code_int = match algorithm {
        Algorithm::SHA1 => {
            let mut mac = Hmac::<Sha1>::new_from_slice(&secret).map_err(|e| e.to_string())?;
            mac.update(&time_bytes);
            let result = mac.finalize().into_bytes();
            let offset = (result[19] & 0x0f) as usize;
            ((result[offset] as u32 & 0x7f) << 24)
                | ((result[offset + 1] as u32 & 0xff) << 16)
                | ((result[offset + 2] as u32 & 0xff) << 8)
                | (result[offset + 3] as u32 & 0xff)
        },
        Algorithm::SHA256 => {
            let mut mac = Hmac::<Sha256>::new_from_slice(&secret).map_err(|e| e.to_string())?;
            mac.update(&time_bytes);
            let result = mac.finalize().into_bytes();
            let offset = (result[31] & 0x0f) as usize;
            ((result[offset] as u32 & 0x7f) << 24)
                | ((result[offset + 1] as u32 & 0xff) << 16)
                | ((result[offset + 2] as u32 & 0xff) << 8)
                | (result[offset + 3] as u32 & 0xff)
        },
        Algorithm::SHA512 => {
            let mut mac = Hmac::<Sha512>::new_from_slice(&secret).map_err(|e| e.to_string())?;
            mac.update(&time_bytes);
            let result = mac.finalize().into_bytes();
            let offset = (result[63] & 0x0f) as usize;
            ((result[offset] as u32 & 0x7f) << 24)
                | ((result[offset + 1] as u32 & 0xff) << 16)
                | ((result[offset + 2] as u32 & 0xff) << 8)
                | (result[offset + 3] as u32 & 0xff)
        }
    };
    
    let modulus = 10_u32.pow(digits);
    let code = code_int % modulus;
    
    Ok(format!("{:0>width$}", code, width = digits as usize))
}

pub fn seconds_until_totp_change(period: u64) -> u64 {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    period - (time % period)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_totp_generation_sha1() {
        let secret = "JBSWY3DPEHPK3PXP"; // "Hello!"
        let code = generate_totp(secret, 6, 30, &Algorithm::SHA1).expect("generate 6 digit");
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_totp_generation_sha256_8digits() {
        let secret = "JBSWY3DPEHPK3PXP";
        let code = generate_totp(secret, 8, 60, &Algorithm::SHA256).expect("generate 8 digit");
        assert_eq!(code.len(), 8);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_totp_with_spaces_and_padding() {
        let secret = "jbsw y3dp ehpk 3pxp====";
        let code = generate_totp(secret, 6, 30, &Algorithm::SHA1).expect("clean secret");
        assert_eq!(code.len(), 6);
    }
}

