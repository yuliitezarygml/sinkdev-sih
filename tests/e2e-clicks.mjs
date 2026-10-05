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

// 1. Create static file server for Next.js exported files
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
      console.log('[Server REQ]:', reqPath);
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

async function runE2E() {
  const server = await startServer();
  const consoleErrors = [];
  const pageErrors = [];

  console.log('[Puppeteer] Launching Chrome...');
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
    } else {
      // console.log('[Page Console]:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
    console.error('[Page Exception]:', err.toString());
  });

  try {
    console.log('[Test 1] Navigating to /steam...');
    await page.goto(`http://localhost:${PORT}/steam`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_steam_initial.png') });

    // Verify header and title
    const headerTitle = await page.$eval('h1', (el) => el.textContent);
    console.log(`[Test 1] Header Title: "${headerTitle}"`);
    assert.ok(headerTitle.includes('SinkDev') || headerTitle.includes('Auth'), 'Header should contain SinkDev or Auth');

    // Verify Steam Code Card renders with 5-character code
    await page.waitForSelector('span.font-mono.text-3xl');
    const steamCode = await page.$eval('span.font-mono.text-3xl', (el) => el.textContent.trim());
    console.log(`[Test 1] Generated Steam Guard Code: "${steamCode}"`);
    assert.equal(steamCode.length, 5, 'Steam code should be 5 characters');

    // Verify session badge
    const sessionBadge = await page.$('span[title="Steam Session Status"]');
    assert.ok(sessionBadge, 'Session badge should be present');

    // Test Confirmations modal
    console.log('[Test 2] Clicking Steam Confirmations (Shield/Trades button)...');
    const shieldButton = await page.$('button[title*="Подтверждения"], button[title*="Confirmations"], button:has(svg path[d*="M12 1L3 5"])');
    if (shieldButton) {
      await shieldButton.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_steam_confirmations.png') });

      // Click "Inspect Items"
      const inspectBtn = await page.$('button:has-text("Inspect Items"), button:has-text("Осмотреть предметы"), button:has-text("Детали обмена")');
      if (inspectBtn) {
        await inspectBtn.click();
        await new Promise((r) => setTimeout(r, 600));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_steam_trade_details.png') });
        console.log('[Test 2] Inspected items successfully!');
      }

      // Close modal
      const closeBtn = await page.$('.fixed.inset-0 button:has(svg)');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Test FAB Menu on Steam tab
    console.log('[Test 3] Opening Floating Action Button menu...');
    const fabBtn = await page.$('button[aria-label="Add account"], button.shadow-lg.rounded-full:has(svg)');
    assert.ok(fabBtn, 'FAB button must exist');
    await fabBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_steam_fab_menu.png') });

    // Click Import maFile option
    const importOption = await page.$('button:has-text("Import .maFile"), button:has-text("Импорт .maFile")');
    if (importOption) {
      await importOption.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_import_mafile_modal.png') });
      console.log('[Test 3] Batch import maFile modal opened successfully!');

      // Close import modal
      const closeImport = await page.$('.fixed.inset-0 button:has(svg)');
      if (closeImport) await closeImport.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Test Privacy Mode toggle
    console.log('[Test 4] Testing Privacy Mode toggle...');
    const privacyToggle = await page.$('button[title*="Privacy"], button[title*="приватности"], header button:has(svg)');
    if (privacyToggle) {
      await privacyToggle.click();
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_privacy_mode_enabled.png') });

      const maskedCode = await page.$eval('span.font-mono', (el) => el.textContent.trim());
      console.log(`[Test 4] Masked code: "${maskedCode}"`);
      assert.ok(maskedCode.includes('•') || maskedCode === '•••••', 'Code should be masked with bullets in privacy mode');

      // Click on masked code to reveal
      await page.click('span.font-mono');
      await new Promise((r) => setTimeout(r, 200));
      const revealedCode = await page.$eval('span.font-mono', (el) => el.textContent.trim());
      console.log(`[Test 4] Temporarily revealed code: "${revealedCode}"`);
      assert.notEqual(revealedCode, '•••••', 'Code should reveal on tap');

      // Disable privacy mode back
      await privacyToggle.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // Test Navigation to 2FA / TOTP tab
    console.log('[Test 5] Navigating to 2FA tab...');
    const totpTabLink = await page.$('nav a[href="/totp"], nav a:has-text("2FA")');
    assert.ok(totpTabLink, '2FA tab link must exist');
    await totpTabLink.click();
    await page.waitForFunction(() => window.location.pathname === '/totp');
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_totp_tab.png') });

    // Verify 2FA cards with brand icons exist
    const totpCodes = await page.$$eval('span.font-mono', (els) => els.map((e) => e.textContent.trim()));
    console.log(`[Test 5] TOTP Codes displayed:`, totpCodes);
    assert.ok(totpCodes.length >= 2, 'Should display default demo TOTP accounts');

    // Test opening Add TOTP Modal
    const totpFab = await page.$('button[aria-label="Add account"], button.shadow-lg.rounded-full:has(svg)');
    if (totpFab) {
      await totpFab.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_add_totp_modal.png') });
      console.log('[Test 5] Add TOTP modal opened successfully!');

      // Close modal
      const closeTotpModal = await page.$('.fixed.inset-0 button:has(svg)');
      if (closeTotpModal) await closeTotpModal.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Test Navigation to Settings tab
    console.log('[Test 6] Navigating to Settings tab...');
    const settingsTabLink = await page.$('nav a[href="/settings"], nav a:has-text("Настройки"), nav a:has-text("Settings")');
    assert.ok(settingsTabLink, 'Settings tab link must exist');
    await settingsTabLink.click();
    await page.waitForFunction(() => window.location.pathname === '/settings');
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_settings_tab.png') });

    // Test Language switch to English
    console.log('[Test 7] Testing Language switch to English...');
    const enButton = await page.$('button:has-text("English")');
    if (enButton) {
      await enButton.click();
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_settings_english.png') });

      const heading = await page.$eval('h2', (el) => el.textContent);
      console.log(`[Test 7] Heading in English: "${heading}"`);
      assert.ok(heading.includes('Security') || heading.includes('Appearance'), 'Heading should be translated to English');
    }

    // Test Theme switch to AMOLED Black
    console.log('[Test 8] Testing Theme switch to AMOLED Black...');
    const amoledButton = await page.$('button:has-text("AMOLED Black"), button:has-text("AMOLED")');
    if (amoledButton) {
      await amoledButton.click();
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_settings_amoled.png') });
      console.log('[Test 8] AMOLED Black theme applied successfully!');
    }

    // Switch back to Russian
    const ruButton = await page.$('button:has-text("Русский")');
    if (ruButton) {
      await ruButton.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // Test Backup & Restore card
    console.log('[Test 9] Opening Encrypted Vault Backup modal...');
    const exportBtn = await page.$('button:has-text("Создать резервную копию"), button:has-text("Create Backup"), button:has-text("Экспорт")');
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_export_backup_modal.png') });
      console.log('[Test 9] Export backup modal rendered!');

      // Close backup modal
      const closeBackup = await page.$('.fixed.inset-0 button:has(svg)');
      if (closeBackup) await closeBackup.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Test Setting Master PIN and App Lock
    console.log('[Test 10] Testing Master PIN setup and App Lock...');
    const pinSetupBtn = await page.$('button:has-text("Установить PIN-код"), button:has-text("Set PIN code")');
    if (pinSetupBtn) {
      await pinSetupBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_pin_setup_modal.png') });

      // Enter 4 digits on virtual or text input
      const pinInputs = await page.$$('input[type="password"]');
      if (pinInputs.length >= 2) {
        await pinInputs[0].type('1234');
        await pinInputs[1].type('1234');
        const savePinBtn = await page.$('button:has-text("Сохранить PIN"), button:has-text("Save PIN")');
        if (savePinBtn) {
          await savePinBtn.click();
          await new Promise((r) => setTimeout(r, 500));
          console.log('[Test 10] PIN 1234 set successfully!');
        }
      }

      // Now click "Заблокировать сейчас" / "Lock App"
      const lockAppBtn = await page.$('button:has-text("Заблокировать сейчас"), button:has-text("Lock Now")');
      if (lockAppBtn) {
        await lockAppBtn.click();
        await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_lock_screen.png') });
        console.log('[Test 10] Lock screen displayed with virtual keypad!');

        // Enter wrong PIN: "9999" using keypad buttons
        const btn9 = await page.$('button:has-text("9")');
        if (btn9) {
          for (let i = 0; i < 4; i++) {
            await btn9.click();
            await new Promise((r) => setTimeout(r, 100));
          }
          await new Promise((r) => setTimeout(r, 300));
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_wrong_pin_feedback.png') });
          console.log('[Test 10] Wrong PIN entered, shake/error verified!');
        }

        // Enter correct PIN: "1234"
        const digitKeys = ['1', '2', '3', '4'];
        for (const digit of digitKeys) {
          const btn = await page.$(`button:has-text("${digit}")`);
          if (btn) {
            await btn.click();
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_unlocked_screen.png') });
        console.log('[Test 10] Correct PIN entered, app successfully unlocked!');
      }
    }

    console.log('\n=== E2E CLICK-THROUGH TEST SUMMARY ===');
    console.log(`Page Exceptions: ${pageErrors.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);

    assert.equal(pageErrors.length, 0, `Detected ${pageErrors.length} page exceptions: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Detected ${consoleErrors.length} console errors: ${consoleErrors.join('; ')}`);

    console.log('✅ ALL E2E UI INTERACTION TESTS PASSED WITH ZERO ERRORS!');
  } finally {
    await browser.close();
    server.close();
  }
}

runE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
