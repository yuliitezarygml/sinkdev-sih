mod commands;
mod crypto;
mod steam;
mod storage;

use commands::{security as security_cmds, steam as steam_cmds, totp as totp_cmds};
use storage::vault::VaultSession;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VaultSession::new())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Security & Vault Lifecycle
            security_cmds::get_security_status,
            security_cmds::setup_pin,
            security_cmds::unlock_vault,
            security_cmds::unlock_vault_biometric,
            security_cmds::lock_vault,
            security_cmds::remove_pin,
            security_cmds::change_pin,
            security_cmds::update_security_settings,
            security_cmds::check_system_time,
            security_cmds::export_encrypted_vault,
            security_cmds::import_encrypted_vault,
            // Steam Guard
            steam_cmds::generate_steam_guard_code,
            steam_cmds::get_steam_account_code,
            steam_cmds::import_mafile,
            steam_cmds::import_batch_mafiles,
            steam_cmds::add_steam_account,
            steam_cmds::get_steam_accounts,
            steam_cmds::rename_steam_account,
            steam_cmds::remove_steam_account,
            steam_cmds::update_steam_session,
            steam_cmds::get_steam_confirmations,
            steam_cmds::respond_steam_confirmation,
            steam_cmds::get_steam_confirmation_details,
            // 2FA / TOTP
            totp_cmds::generate_totp_code,
            totp_cmds::get_totp_account_code,
            totp_cmds::parse_otpauth_uri,
            totp_cmds::import_google_migration,
            totp_cmds::add_totp_account,
            totp_cmds::get_totp_accounts,
            totp_cmds::rename_totp_account,
            totp_cmds::remove_totp_account,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
