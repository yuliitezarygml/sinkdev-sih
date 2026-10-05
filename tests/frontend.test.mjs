import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/lib/i18n.ts';
import { getBrandMeta } from '../src/lib/brands.ts';

test('i18n: translations have identical keys in RU and EN', () => {
  const enKeys = Object.keys(translations.en).sort();
  const ruKeys = Object.keys(translations.ru).sort();

  assert.deepEqual(
    ruKeys,
    enKeys,
    `Missing or mismatched keys in translations dictionary!`
  );

  for (const key of enKeys) {
    assert.ok(translations.en[key].length > 0, `English key ${key} is empty`);
    assert.ok(translations.ru[key].length > 0, `Russian key ${key} is empty`);
  }
});

test('brands: recognizes popular services by issuer and label', () => {
  const cases = [
    { input: 'Google', expectedId: 'google' },
    { input: 'Gmail: user@gmail.com', expectedId: 'google' },
    { input: 'GitHub', expectedId: 'github' },
    { input: 'Discord', expectedId: 'discord' },
    { input: 'Binance Exchange', expectedId: 'binance' },
    { input: 'Telegram', expectedId: 'telegram' },
    { input: 'Steam Community', expectedId: 'steam' },
    { input: 'Epic Games', expectedId: 'epic' },
    { input: 'VKontakte', expectedId: 'vk' },
    { input: 'Twitch', expectedId: 'twitch' },
    { input: 'Blizzard Battle.net', expectedId: 'blizzard' },
    { input: 'Microsoft Office 365', expectedId: 'microsoft' },
    { input: 'Reddit', expectedId: 'reddit' },
    { input: 'UnknownCustomService', expectedId: 'default' },
  ];

  for (const { input, expectedId } of cases) {
    const meta = getBrandMeta(input);
    assert.equal(
      meta.id,
      expectedId,
      `Failed to match brand for "${input}". Expected ${expectedId}, got ${meta.id}`
    );
    assert.ok(meta.color, `Brand ${meta.id} missing color`);
    assert.ok(meta.name, `Brand ${meta.id} missing name`);
  }
});
