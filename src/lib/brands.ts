import { BRAND_ICON_CATALOG, BRAND_ICON_SOURCE } from './brand-icon-catalog.generated.ts';
import { BRAND_ICON_EXTRAS } from './brand-icon-extras.ts';

export { BRAND_ICON_SOURCE };

export interface BrandMeta {
  id: string;
  name: string;
  iconPath: string | null;
  color: string;
  bgColor: string;
}

interface BrandIconEntry {
  readonly id: string;
  readonly name: string;
  readonly iconPath: string;
  readonly aliases: readonly string[];
}

const BRAND_ICONS: readonly BrandIconEntry[] = [
  ...BRAND_ICON_EXTRAS,
  ...BRAND_ICON_CATALOG,
];

const WELL_KNOWN_ALIASES: ReadonlyArray<{
  targetId: string;
  aliases: readonly string[];
}> = [
  { targetId: 'amazon-web-services', aliases: ['AWS'] },
  { targetId: 'apple', aliases: ['iCloud'] },
  { targetId: 'battle-net', aliases: ['Blizzard', 'Battle.net', 'Battlenet'] },
  { targetId: 'epic-games', aliases: ['Epic', 'EpicGames', 'Unreal'] },
  { targetId: 'facebook', aliases: ['Oculus'] },
  { targetId: 'google', aliases: ['Gmail', 'Google Workspace', 'Google Authenticator'] },
  { targetId: 'jetbrains', aliases: ['IntelliJ'] },
  { targetId: 'meta', aliases: ['Meta Platforms'] },
  { targetId: 'microsoft', aliases: ['Office 365', 'Office365', 'Outlook', 'Hotmail', 'Xbox'] },
  { targetId: 'openai', aliases: ['ChatGPT'] },
  { targetId: 'playstation', aliases: ['PSN'] },
  { targetId: 'proton', aliases: ['ProtonMail'] },
  { targetId: 'steam', aliases: ['Valve'] },
  { targetId: 'twitter', aliases: ['X.com', 'X Corp'] },
  { targetId: 'vk', aliases: ['VKontakte'] },
];

const EMAIL_DOMAIN_TARGETS: Readonly<Record<string, string>> = {
  'gmail.com': 'google',
  'googlemail.com': 'google',
  'hotmail.com': 'microsoft',
  'icloud.com': 'apple',
  'live.com': 'microsoft',
  'me.com': 'apple',
  'outlook.com': 'microsoft',
  'proton.me': 'proton',
  'protonmail.com': 'proton',
};

const GENERIC_ISSUERS = new Set(['', '2fa', 'account', 'authenticator', 'totp']);

const COMPATIBLE_RESULT_IDS: Readonly<Record<string, string>> = {
  'battle-net': 'blizzard',
  'epic-games': 'epic',
  'majestic-rp': 'majestic',
  'riot-games': 'riot',
};

const FALLBACK_PALETTES = [
  { color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
  { color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.2)' },
  { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' },
  { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' },
  { color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.2)' },
  { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  { color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.2)' },
  { color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.2)' },
  { color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.2)' },
] as const;

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compact(value: string): string {
  return normalize(value).replace(/\s/g, '');
}

const ICONS_BY_ID = new Map(BRAND_ICONS.map((entry) => [entry.id, entry]));
const ICONS_BY_EXACT_ALIAS = new Map<string, BrandIconEntry>();
const SEARCHABLE_ALIASES: Array<{
  normalized: string;
  compact: string;
  entry: BrandIconEntry;
}> = [];

function registerAlias(alias: string, entry: BrandIconEntry) {
  const normalizedAlias = normalize(alias);
  const compactAlias = compact(alias);
  if (!normalizedAlias || !compactAlias) return;

  if (!ICONS_BY_EXACT_ALIAS.has(compactAlias)) {
    ICONS_BY_EXACT_ALIAS.set(compactAlias, entry);
  }
  SEARCHABLE_ALIASES.push({ normalized: normalizedAlias, compact: compactAlias, entry });
}

for (const entry of BRAND_ICONS) {
  registerAlias(entry.id, entry);
  registerAlias(entry.name, entry);
  for (const alias of entry.aliases) registerAlias(alias, entry);
}

for (const aliasGroup of WELL_KNOWN_ALIASES) {
  const target = ICONS_BY_ID.get(aliasGroup.targetId);
  if (!target) continue;
  for (const alias of aliasGroup.aliases) registerAlias(alias, target);
}

SEARCHABLE_ALIASES.sort((left, right) => right.compact.length - left.compact.length);

function findIcon(value: string): BrandIconEntry | null {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return null;

  const exact = ICONS_BY_EXACT_ALIAS.get(compact(value));
  if (exact) return exact;

  const paddedValue = ` ${normalizedValue} `;
  for (const alias of SEARCHABLE_ALIASES) {
    if (alias.compact.length < 4) continue;

    if (paddedValue.includes(` ${alias.normalized} `)) {
      return alias.entry;
    }
  }

  return null;
}

function splitCombinedValue(issuerOrLabel: string, label: string): [string, string] {
  if (label) return [issuerOrLabel, label];

  const colonIndex = issuerOrLabel.indexOf(':');
  if (colonIndex > 0) {
    return [issuerOrLabel.slice(0, colonIndex), issuerOrLabel.slice(colonIndex + 1)];
  }

  const parenthesisIndex = issuerOrLabel.indexOf('(');
  if (parenthesisIndex > 0) {
    return [
      issuerOrLabel.slice(0, parenthesisIndex),
      issuerOrLabel.slice(parenthesisIndex + 1).replace(/\)$/, ''),
    ];
  }

  return [issuerOrLabel, label];
}

function iconFromEmail(label: string): BrandIconEntry | null {
  const match = label.toLowerCase().match(/@([a-z0-9.-]+)$/);
  const targetId = match ? EMAIL_DOMAIN_TARGETS[match[1]] : undefined;
  return targetId ? ICONS_BY_ID.get(targetId) ?? null : null;
}

function fallbackPalette(value: string) {
  const hash = Array.from(value.toLowerCase()).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) | 0,
    0,
  );
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length];
}

export function getBrandMeta(issuerOrLabel?: string, label?: string): BrandMeta {
  const [rawIssuer, rawLabel] = splitCombinedValue(
    (issuerOrLabel ?? '').trim(),
    (label ?? '').trim(),
  );
  const issuer = rawIssuer.trim();
  const accountLabel = rawLabel.trim();
  const issuerMatch = findIcon(issuer);
  const labelMatch = issuerMatch ? null : findIcon(accountLabel.replace(/@[^\s]+$/, ''));
  const emailMatch =
    !issuerMatch && GENERIC_ISSUERS.has(normalize(issuer)) ? iconFromEmail(accountLabel) : null;
  const match = issuerMatch ?? labelMatch ?? emailMatch;

  if (match) {
    const palette = fallbackPalette(match.id);
    return {
      id: COMPATIBLE_RESULT_IDS[match.id] ?? match.id,
      name: match.name,
      iconPath: match.iconPath,
      ...palette,
    };
  }

  const name = issuer || accountLabel || '2FA';
  return {
    id: 'default',
    name,
    iconPath: null,
    ...fallbackPalette(name),
  };
}

export function getBrandConfig(issuer?: string, label?: string): BrandMeta | null {
  const meta = getBrandMeta(issuer, label);
  return meta.id === 'default' ? null : meta;
}

export function getBrandIconCount(): number {
  return BRAND_ICONS.length;
}
