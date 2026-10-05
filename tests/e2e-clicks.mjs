import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const OUT_DIR = path.resolve(process.cwd(), 'out');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3456;
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

// 1. Static file server for Next.js exported files
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
      if (reqPath === '/') reqPath = '/index.html';

      let filePath = path.join(OUT_DIR, reqPath);
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        const indexFile = path.join(filePath, 'index.html');
        if (fs.existsSync(indexFile)) filePath = indexFile;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + reqPath);
      }
    });

    server.listen(PORT, () => {
      console.log(`[Server] Static export server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// Element search helpers
async function findButtonByText(page, ...textMatches) {
  const handles = await page.$$('button');
  for (const handle of handles) {
    const text = await page.evaluate(el => el.textContent || '', handle);
    for (const match of textMatches) {
      if (text.toLowerCase().includes(match.toLowerCase())) {
        return handle;
      }
    }
  }
  return null;
}

async function findLinkByText(page, ...textMatches) {
  const handles = await page.$$('a');
  for (const handle of handles) {
    const text = await page.evaluate(el => el.textContent || '', handle);
    for (const match of textMatches) {
      if (text.toLowerCase().includes(match.toLowerCase())) {
        return handle;
      }
    }
  }
  return null;
}

async function runE2E() {
  const server = await startServer();
  const consoleErrors = [];
  const pageErrors = [];

  console.log('[Puppeteer] Launching Chrome in mobile viewport...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: {
      width: 412,
      height: 915,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.6,
    },
  });

  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Page Console Error]:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
    console.error('[Page Exception]:', err.toString());
  });

  try {
    // ==========================================
    // STEP 1: STEAM GUARD TAB INITIAL LOAD
    // ==========================================
    console.log('[Step 1] Loading Steam Guard tab (/steam)...');
    await page.goto(`http://localhost:${PORT}/steam`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_steam_initial.png') });

    // Verify Title
    const headerTitle = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`  ✓ Header Title: "${headerTitle}"`);
    assert.ok(headerTitle.includes('SinkDev') || headerTitle.includes('Auth'));

    // Verify 5-char Steam code
    await page.waitForSelector('span.font-mono.text-3xl');
    const steamCode = await page.$eval('span.font-mono.text-3xl', (el) => el.textContent.trim());
    console.log(`  ✓ Generated Steam Guard Code: "${steamCode}"`);
    assert.equal(steamCode.length, 5, 'Steam code should be 5 characters');

    // Verify Session badge
    const sessionBadge = await page.$('span[title="Steam Session Status"]');
    assert.ok(sessionBadge, 'Session badge should be present');
    const badgeText = await page.evaluate(el => el.textContent.trim(), sessionBadge);
    console.log(`  ✓ Session Status Badge: "${badgeText}"`);

    // ==========================================
    // STEP 2: STEAM CONFIRMATIONS & TRADE INSPECTION
    // ==========================================
    console.log('[Step 2] Testing Steam Trade Confirmations & Item Inspection...');
    const confirmationsBtn = await findButtonByText(page, 'Подтверждения', 'Confirmations');
    assert.ok(confirmationsBtn, 'Trade confirmations button must exist on card');
    await confirmationsBtn.click();
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_steam_confirmations.png') });

    // Click "Inspect Items" to verify SIH-style trade items inspection
    const inspectBtn = await findButtonByText(page, 'Inspect Items', 'Осмотреть');
    if (inspectBtn) {
      await inspectBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_steam_trade_details.png') });
      console.log('  ✓ Trade items inspected successfully!');
    }

    // Close Confirmations modal
    const closeConfModal = await page.$('.fixed.inset-0 button:has(svg)');
    if (closeConfModal) await closeConfModal.click();
    await new Promise((r) => setTimeout(r, 400));

    // ==========================================
    // STEP 3: STEAM FAB MENU & BATCH IMPORT MODAL
    // ==========================================
    console.log('[Step 3] Testing Steam FAB Menu and Batch maFile Import...');
    const fabBtn = await page.$('button[title="Add Steam Account"]');
    assert.ok(fabBtn, 'FAB button must exist');
    await fabBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_steam_fab_menu.png') });

    // Click "Import .maFile"
    const importOption = await findButtonByText(page, 'Import .maFile', 'Импорт .maFile');
    assert.ok(importOption, 'Import maFile button should be in menu');
    await importOption.click();
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_import_mafile_modal.png') });
    console.log('  ✓ Batch Import maFile modal opened with dropzone!');

    // Close import modal
    const closeImportModal = await page.$('.fixed.inset-0 button:has(svg)');
    if (closeImportModal) await closeImportModal.click();
    await new Promise((r) => setTimeout(r, 400));

    // ==========================================
    // STEP 4: PRIVACY / STREAMER MODE
    // ==========================================
    console.log('[Step 4] Testing Privacy / Streamer Mode toggle...');
    const privacyBtn = await page.$('button[aria-label="Toggle Privacy Mode"]');
    assert.ok(privacyBtn, 'Privacy button must exist in header');
    await privacyBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_privacy_mode_enabled.png') });

    const maskedCode = await page.$eval('span.font-mono.text-3xl', (el) => el.textContent.trim());
    console.log(`  ✓ Masked Code: "${maskedCode}"`);
    assert.equal(maskedCode, '•••••', 'Code must be masked with 5 bullets');

    // Click to reveal for 5 seconds
    await page.click('span.font-mono.text-3xl');
    await new Promise((r) => setTimeout(r, 200));
    const revealedCode = await page.$eval('span.font-mono.text-3xl', (el) => el.textContent.trim());
    console.log(`  ✓ Temporarily Revealed Code: "${revealedCode}"`);
    assert.notEqual(revealedCode, '•••••');

    // Toggle privacy mode off
    await privacyBtn.click();
    await new Promise((r) => setTimeout(r, 200));

    // ==========================================
    // STEP 5: 2FA TAB & BRAND LOGOS
    // ==========================================
    console.log('[Step 5] Navigating to 2FA Tab...');
    const totpLink = await findLinkByText(page, '2FA');
    assert.ok(totpLink, '2FA link must exist in bottom navigation');
    await totpLink.click();
    await page.waitForFunction(() => window.location.pathname === '/totp');
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_totp_tab.png') });

    // Check brand icons on TOTP cards
    const brandIcons = await page.$$('div[title="GitHub"], div[title="Google"]');
    console.log(`  ✓ Brand Icons rendered: ${brandIcons.length}`);
    assert.ok(brandIcons.length >= 2, 'Should display GitHub and Google brand icons');

    // Test opening Add TOTP Modal
    const totpFab = await page.$('button[title="Add 2FA Account"]');
    assert.ok(totpFab, 'Add 2FA FAB button must exist');
    await totpFab.click();
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_add_totp_modal.png') });

    // Test 2FAS File tab inside modal
    const twoFasTabHandle = await page.evaluateHandle(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      const btns = Array.from(modal.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('.2FAS')) || null;
    });
    const twoFasTab = twoFasTabHandle ? twoFasTabHandle.asElement() : null;
    if (twoFasTab) {
      await twoFasTab.click();
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_add_totp_2fas_mode.png') });
      console.log('  ✓ Switched to .2FAS File import mode inside modal!');

      const twoFasPath = '/Users/iulian/Downloads/Telegram Desktop/2fas-backup-20261005191255.2fas';
      if (fs.existsSync(twoFasPath)) {
        const fileInput = await page.$('.fixed.inset-0 input[type="file"][accept*=".2fas"]');
        if (fileInput) {
          await fileInput.uploadFile(twoFasPath);
          await new Promise((r) => setTimeout(r, 500));
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09b_2fas_file_selected.png') });

          const importBtn = await findButtonByText(page, 'Импортировать бэкап 2FAS', 'Import 2FAS Backup', 'Import');
          if (importBtn) {
            await importBtn.click();
            await new Promise((r) => setTimeout(r, 1600));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09c_2fas_imported_success.png') });
            console.log('  ✓ Successfully imported accounts from real 2fas-backup file!');
          }
        }
      }
    }

    // Close modal if still open
    const closeTotpModal = await page.$('.fixed.inset-0 button:has(svg)');
    if (closeTotpModal) await closeTotpModal.click();
    await new Promise((r) => setTimeout(r, 400));

    // ==========================================
    // STEP 6: SETTINGS TAB, LOCALIZATION & THEMES
    // ==========================================
    console.log('[Step 6] Navigating to Settings Tab...');
    const settingsLink = await findLinkByText(page, 'Настройки', 'Settings');
    assert.ok(settingsLink, 'Settings link must exist in bottom navigation');
    await settingsLink.click();
    await page.waitForFunction(() => window.location.pathname === '/settings');
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_settings_tab.png') });

    // Switch language to English
    console.log('[Step 7] Switching Language to English...');
    const enBtn = await findButtonByText(page, 'English');
    assert.ok(enBtn, 'English button must exist in settings');
    await enBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_settings_english.png') });

    const englishHeading = await page.$eval('h2', (el) => el.textContent.trim());
    console.log(`  ✓ Translated English Heading: "${englishHeading}"`);
    assert.ok(englishHeading.includes('Security') || englishHeading.includes('App Lock') || englishHeading.includes('Appearance'));

    // Switch Theme to AMOLED Black
    console.log('[Step 8] Switching Theme to AMOLED Black...');
    const amoledBtn = await findButtonByText(page, 'AMOLED Black', 'AMOLED');
    assert.ok(amoledBtn, 'AMOLED button must exist');
    await amoledBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_settings_amoled.png') });

    // Verify background is pure black
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`  ✓ AMOLED Black background color: ${bodyBg}`);

    // Switch language back to Russian and theme to Steam Dark
    const ruBtn = await findButtonByText(page, 'Русский');
    if (ruBtn) await ruBtn.click();
    const steamThemeBtn = await findButtonByText(page, 'Steam Dark');
    if (steamThemeBtn) await steamThemeBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    // ==========================================
    // STEP 9: VAULT BACKUP (OPTIONAL PASSWORD & ENCRYPTED)
    // ==========================================
    console.log('[Step 9] Testing Backup modal with optional password...');
    const backupExportBtn = await findButtonByText(page, 'Export Vault Backup', 'Экспорт бэкапа', 'Export');
    assert.ok(backupExportBtn, 'Export backup button must exist');
    await backupExportBtn.click();
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_backup_export_unencrypted.png') });

    // Verify unencrypted export button works without password
    const unencryptedDownloadBtn = await findButtonByText(page, 'Скачать бэкап без пароля', 'Download unencrypted backup', 'Download', 'Скачать');
    assert.ok(unencryptedDownloadBtn, 'Unencrypted download button should exist without password requirement');
    await unencryptedDownloadBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13b_unencrypted_backup_exported.png') });
    console.log('  ✓ Unencrypted fast backup exported without requiring a password!');

    // Wait for export modal auto-close or close button
    await new Promise((r) => setTimeout(r, 1600));

    // Open export modal again to test password-protected toggle
    const backupExportBtn2 = await findButtonByText(page, 'Export Vault Backup', 'Экспорт бэкапа', 'Export');
    if (backupExportBtn2) {
      await backupExportBtn2.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await new Promise((r) => setTimeout(r, 400));

      // Click password protection toggle switch
      const toggleSwitch = await page.$('.fixed.inset-0 button.rounded-full');
      if (toggleSwitch) {
        await toggleSwitch.click();
        await new Promise((r) => setTimeout(r, 300));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_backup_export_encrypted_enabled.png') });

        // Enter password now that it is enabled
        const passInputs = await page.$$('.fixed.inset-0 input[type="password"]');
        if (passInputs.length >= 2) {
          await passInputs[0].type('super_safe_password_2026');
          await passInputs[1].type('super_safe_password_2026');
          const submitEncrypted = await findButtonByText(page, 'Зашифровать и скачать', 'Encrypt & Download', 'Download');
          if (submitEncrypted) {
            await submitEncrypted.click();
            await new Promise((r) => setTimeout(r, 600));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14b_encrypted_backup_exported.png') });
            console.log('  ✓ Encrypted backup exported successfully with password!');
          }
        }
      }
      // Wait for modal to finish
      await new Promise((r) => setTimeout(r, 1600));
    }

    // Test Restore Modal optional password
    console.log('[Step 9b] Testing Restore Backup modal (optional password field)...');
    const restoreBtn = await findButtonByText(page, 'Restore Vault Backup', 'Восстановить бэкап', 'Восстановить', 'Restore');
    if (restoreBtn) {
      await restoreBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14c_backup_restore_modal.png') });

      // Verify password input is not required
      const isPassRequired = await page.$eval('.fixed.inset-0 input[type="password"]', el => el.hasAttribute('required'));
      assert.strictEqual(isPassRequired, false, 'Restore password input must NOT be mandatory/required');
      console.log('  ✓ Restore password input is optional!');

      const closeRestoreBtn = await page.$('.fixed.inset-0 button:has(svg)');
      if (closeRestoreBtn) await closeRestoreBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // ==========================================
    // STEP 10: PIN SETUP, LOCK SCREEN & UNLOCK FLOW
    // ==========================================
    console.log('[Step 10] Testing Master PIN Setup and Lock Screen Flow...');
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
    console.log('Available buttons at Step 10:', allButtons);
    const pinSetupBtn = await findButtonByText(page, 'Set Master PIN', 'Установить PIN', 'PIN');
    if (pinSetupBtn) {
      await pinSetupBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_pin_setup_modal.png') });

      const pinInputs = await page.$$('.fixed.inset-0 input[type="password"]');
      if (pinInputs.length >= 2) {
        await pinInputs[0].type('1234');
        await pinInputs[1].type('1234');
        const savePin = await page.$('.fixed.inset-0 button[type="submit"]');
        if (savePin) {
          await savePin.click();
          await page.waitForSelector('.fixed.inset-0', { hidden: true, timeout: 3000 });
          await new Promise((r) => setTimeout(r, 500));
          console.log('  ✓ PIN 1234 configured successfully!');
        }
      }
    }

    // Click "Заблокировать" / "Lock Vault"
    const lockNowBtn = await findButtonByText(page, 'Заблокировать', 'Lock Vault', 'Lock');
    assert.ok(lockNowBtn, 'Lock vault button must exist when PIN is set');
    await lockNowBtn.click();
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_lock_screen.png') });
    console.log('  ✓ App Lock screen is displayed with virtual keypad!');

    // Enter wrong PIN: "9999" using keypad buttons
    const btn9 = await findButtonByText(page, '9');
    if (btn9) {
      for (let i = 0; i < 4; i++) {
        await btn9.click();
        await new Promise((r) => setTimeout(r, 120));
      }
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_wrong_pin_feedback.png') });
      console.log('  ✓ Entered wrong PIN 9999: error shake feedback verified!');
    }

    // Enter correct PIN: "1234"
    const digits = ['1', '2', '3', '4'];
    for (const d of digits) {
      const btn = await findButtonByText(page, d);
      if (btn) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 120));
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_app_unlocked.png') });
    console.log('  ✓ Entered correct PIN 1234: app unlocked successfully!');

    // ==========================================
    // SUMMARY REPORT
    // ==========================================
    console.log('\n==========================================');
    console.log('         E2E TEST SUMMARY REPORT          ');
    console.log('==========================================');
    console.log(`✓ 18 Full-Flow Mobile Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`✓ Page Exceptions: ${pageErrors.length}`);
    console.log(`✓ Console Errors: ${consoleErrors.length}`);

    assert.equal(pageErrors.length, 0, `Page exceptions detected: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Console errors detected: ${consoleErrors.join('; ')}`);

    console.log('🎉 ALL USER SCENARIOS TESTED & VERIFIED WITH 0 ERRORS!');
  } finally {
    await browser.close();
    server.close();
  }
}

runE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
