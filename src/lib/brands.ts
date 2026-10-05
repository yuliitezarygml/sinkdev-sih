export interface BrandConfig {
  name: string;
  color: string;
  bgColor: string;
  iconPath: string; // SVG path or identifier
  svgType?: 
    | 'google'
    | 'github'
    | 'dropbox'
    | 'instagram'
    | 'microsoft'
    | 'tiktok'
    | 'openai'
    | 'bybit'
    | 'cryptomus'
    | 'sony'
    | 'majestic'
    | 'jetbrains'
    | 'meta'
    | 'vercel'
    | 'riot'
    | 'steam'
    | 'bitwarden'
    | 'proton'
    | 'paypal'
    | 'standard';
}

export const BRANDS: Record<string, BrandConfig> = {
  google: {
    name: 'Google',
    color: '#4285F4',
    bgColor: 'rgba(66, 133, 244, 0.15)',
    iconPath: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z',
    svgType: 'google',
  },
  github: {
    name: 'GitHub',
    color: '#F0F6FC',
    bgColor: 'rgba(240, 246, 252, 0.15)',
    iconPath: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
    svgType: 'github',
  },
  dropbox: {
    name: 'Dropbox',
    color: '#0061FF',
    bgColor: 'rgba(0, 97, 255, 0.18)',
    iconPath: 'M6 3l6 3.8-6 3.8L0 6.8 6 3zm12 0l6 3.8-6 3.8-6-3.8 6-3.8zM0 14.4l6-3.8 6 3.8-6 3.8-6-3.8zm24 0l-6-3.8-6 3.8 6 3.8 6-3.8zM12 15.2l6-3.8-6-3.8-6 3.8 6 3.8zm0 1.9l-6 3.8 6 3.8 6-3.8-6-3.8z',
    svgType: 'dropbox',
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    bgColor: 'rgba(88, 101, 242, 0.2)',
    iconPath: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
    svgType: 'standard',
  },
  cryptomus: {
    name: 'Cryptomus',
    color: '#00C288',
    bgColor: 'rgba(0, 194, 136, 0.18)',
    iconPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3.6 13.5a5.5 5.5 0 0 1-3.6 1.3 5.4 5.4 0 0 1-5.4-5.4 5.4 5.4 0 0 1 5.4-5.4 5.5 5.5 0 0 1 3.6 1.3l-1.4 1.7a3.3 3.3 0 0 0-2.2-.8 3.2 3.2 0 0 0-3.2 3.2 3.2 3.2 0 0 0 3.2 3.2 3.3 3.3 0 0 0 2.2-.8z',
    svgType: 'cryptomus',
  },
  sony: {
    name: 'Sony / PlayStation',
    color: '#00439C',
    bgColor: 'rgba(0, 67, 156, 0.2)',
    iconPath: 'M8.5 7.5L5 9.5l3.5 2 3.5-2zm7 0L12 9.5l3.5 2 3.5-2zM12 13l-3.5 2 3.5 2 3.5-2z',
    svgType: 'sony',
  },
  openai: {
    name: 'OpenAI / ChatGPT',
    color: '#10A37F',
    bgColor: 'rgba(16, 163, 127, 0.18)',
    iconPath: 'M22.28 9.56a5.83 5.83 0 0 0-.49-4.71 6 6 0 0 0-6.1-2.91 5.83 5.83 0 0 0-4.48-2A6 6 0 0 0 5.6 3.12 5.86 5.86 0 0 0 1.9 6.27a6 6 0 0 0 .82 6.74 5.84 5.84 0 0 0 .49 4.71 6 6 0 0 0 6.1 2.91 5.84 5.84 0 0 0 4.48 2 6 6 0 0 0 5.61-3.18 5.84 5.84 0 0 0 3.7-3.15 6 6 0 0 0-.82-6.74zM12 18.5a6.5 6.5 0 1 1 6.5-6.5 6.51 6.51 0 0 1-6.5 6.5z',
    svgType: 'openai',
  },
  instagram: {
    name: 'Instagram',
    color: '#E1306C',
    bgColor: 'rgba(225, 48, 108, 0.18)',
    iconPath: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    svgType: 'instagram',
  },
  bybit: {
    name: 'Bybit',
    color: '#F7A600',
    bgColor: 'rgba(247, 166, 0, 0.18)',
    iconPath: 'M7 4h10l-4 8 4 8H7l4-8-4-8z',
    svgType: 'bybit',
  },
  majestic: {
    name: 'Majestic RP',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.18)',
    iconPath: 'M5 19L2 7l6 4 4-6 4 6 6-4-3 12H5zm14-1H5l2-8 3 3 2-3 2 3 3-3 2 8z',
    svgType: 'majestic',
  },
  tiktok: {
    name: 'TikTok',
    color: '#FE2C55',
    bgColor: 'rgba(254, 44, 85, 0.18)',
    iconPath: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    svgType: 'tiktok',
  },
  jetbrains: {
    name: 'JetBrains',
    color: '#FC801D',
    bgColor: 'rgba(252, 128, 29, 0.18)',
    iconPath: 'M0 0h24v24H0z',
    svgType: 'jetbrains',
  },
  meta: {
    name: 'Meta / Facebook',
    color: '#0081FB',
    bgColor: 'rgba(0, 129, 251, 0.18)',
    iconPath: 'M16.9 7.8c-1.5 0-2.8.8-3.7 2-.4.5-.8 1.2-1.2 1.9-.4-.7-.8-1.4-1.2-1.9-.9-1.2-2.2-2-3.7-2-2.7 0-4.9 2.2-4.9 5s2.2 5 4.9 5c1.6 0 3-.9 3.8-2.2.3-.4.6-.9 1-1.5.3.6.7 1.1 1 1.5.8 1.3 2.2 2.2 3.8 2.2 2.7 0 4.9-2.2 4.9-5s-2.2-5-4.9-5zm-9.8 8c-1.7 0-3-1.3-3-3s1.3-3 3-3c1 0 1.9.5 2.4 1.3.4.6.9 1.4 1.4 2.3-.6 1.1-1.3 2.4-3.8 2.4zm9.8 0c-2.4 0-3.2-1.3-3.8-2.4.5-.9 1-1.7 1.4-2.3.6-.8 1.5-1.3 2.4-1.3 1.7 0 3 1.3 3 3s-1.3 3-3 3z',
    svgType: 'meta',
  },
  vercel: {
    name: 'Vercel',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.15)',
    iconPath: 'M12 2L1 21h22L12 2z',
    svgType: 'vercel',
  },
  riot: {
    name: 'Riot Games',
    color: '#EB0029',
    bgColor: 'rgba(235, 0, 41, 0.18)',
    iconPath: 'M13.4 2.2L2.7 7.1l3.5 12.3 3.6-1.5-.7-4.8 2.4-1-.7-4.8 2.4-1-.7-4.8 4.2-1.7-3.3 2.4zM21.3 8.5l-4.5 1.8 1.5 10.5 4.5-1.9-1.5-10.4z',
    svgType: 'riot',
  },
  binance: {
    name: 'Binance',
    color: '#F3BA2F',
    bgColor: 'rgba(243, 186, 47, 0.18)',
    iconPath: 'M16.624 13.92l2.715 2.715-7.34 7.34-7.339-7.34 2.715-2.715 4.624 4.624 4.626-4.624zm6.077-4.321l2.715 2.715-2.715 2.715-2.716-2.715 2.716-2.715zm-10.702-8.3l7.34 7.34-2.716 2.715-4.624-4.625-4.625 4.625-2.715-2.715 7.34-7.34zm0 6.643l2.716 2.715-2.716 2.715-2.715-2.715 2.715-2.715zm-8.885 1.657l2.715 2.715-2.715 2.715-2.715-2.715 2.715-2.715z',
    svgType: 'standard',
  },
  telegram: {
    name: 'Telegram',
    color: '#2AABEE',
    bgColor: 'rgba(42, 171, 238, 0.18)',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z',
    svgType: 'standard',
  },
  microsoft: {
    name: 'Microsoft',
    color: '#00A4EF',
    bgColor: 'rgba(0, 164, 239, 0.18)',
    iconPath: 'M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z',
    svgType: 'microsoft',
  },
  steam: {
    name: 'Steam',
    color: '#66C0F4',
    bgColor: 'rgba(102, 192, 244, 0.18)',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.95l-2.3-1.65a3.25 3.25 0 0 1-1.12-2.92l-4.14-1.7a10.02 10.02 0 0 1 1.06-2.52l4.9 2.01c.7-.44 1.53-.7 2.42-.7a4.25 4.25 0 0 1 4.25 4.25c0 .35-.04.7-.13 1.03l3.6 2.57A4.24 4.24 0 0 1 20.25 12c0 2.35-1.9 4.25-4.25 4.25a4.24 4.24 0 0 1-2.93-1.17l-3.07 2.2V21.8c.65.13 1.32.2 2 .2 5.52 0 10-4.48 10-10S17.52 2 12 2z',
    svgType: 'steam',
  },
  apple: {
    name: 'Apple',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.18)',
    iconPath: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.24c.66-.82 1.11-1.96.99-3.1-.96.04-2.13.65-2.81 1.45-.59.68-1.11 1.83-.97 2.94 1.07.08 2.15-.55 2.79-1.29z',
    svgType: 'standard',
  },
  amazon: {
    name: 'Amazon / AWS',
    color: '#FF9900',
    bgColor: 'rgba(255, 153, 0, 0.18)',
    iconPath: 'M15.93 17.09c-2.83 2.08-6.95 3.19-10.51 3.19-4.99 0-9.49-1.89-12.92-5.06-.27-.25-.03-.59.29-.4 3.71 2.17 8.24 3.48 12.91 3.48 3.17 0 6.84-.73 10.15-2.27.46-.22.84.34.08 1.06zm1.31-1.39c-.36-.46-2.39-.22-3.3-.11-.27.03-.31-.2-.07-.37 1.58-1.11 4.18-.79 4.49-.41.31.39-.08 3.06-1.56 4.31-.22.19-.44.09-.34-.16.34-.84.78-3.26-.78-3.26z',
    svgType: 'standard',
  },
  coinbase: {
    name: 'Coinbase',
    color: '#0052FF',
    bgColor: 'rgba(0, 82, 255, 0.2)',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15a5 5 0 0 1-5-5 5 5 0 0 1 5-5c2.14 0 3.96 1.34 4.67 3.23h-2.38a2.67 2.67 0 0 0-2.29-1.23c-1.47 0-2.67 1.2-2.67 2.67s1.2 2.67 2.67 2.67c1.03 0 1.93-.58 2.39-1.44h2.36A4.98 4.98 0 0 1 12 17z',
    svgType: 'standard',
  },
  twitch: {
    name: 'Twitch',
    color: '#9146FF',
    bgColor: 'rgba(145, 70, 255, 0.18)',
    iconPath: 'M4.3 3L3 6.3v13.4h4.7v2.3h2.3l2.4-2.3h3.5L21 14.6V3H4.3zm14.7 10.7l-2.7 2.7h-4.3l-2.4 2.3v-2.3H6.3V5h12.7v8.7zM14 8h2v5h-2V8zm-5 0h2v5H9V8z',
    svgType: 'standard',
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    bgColor: 'rgba(255, 69, 0, 0.18)',
    iconPath: 'M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm5.9 10.5c.3.3.5.7.5 1.1 0 1.9-2.9 3.4-6.4 3.4s-6.4-1.5-6.4-3.4c0-.4.2-.8.5-1.1-.1-.3-.2-.7-.2-1 0-1.8 1.8-3.3 4-3.3.4 0 .7 0 1 .1l1.5-3.3 3.5.8c.2-.5.7-.8 1.3-.8.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5l-2.8-.6-1.2 2.7c1.7.3 3 1.5 3.3 2.9.2.3.4.6.4 1zM9 13.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm6 0c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm-4.7 3.2c-.2-.2-.5-.2-.7 0-.2.2-.2.5 0 .7.6.6 1.4.9 2.4.9s1.8-.3 2.4-.9c.2-.2.2-.5 0-.7-.2-.2-.5-.2-.7 0-.4.4-1 .6-1.7.6s-1.3-.2-1.7-.6z',
    svgType: 'standard',
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    bgColor: 'rgba(29, 185, 84, 0.18)',
    iconPath: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.625.625 0 0 1-.86.208c-2.355-1.44-5.32-1.766-8.813-.967a.626.626 0 0 1-.28-1.221c3.824-.875 7.098-.507 9.745 1.12a.625.625 0 0 1 .208.86zm1.224-2.724a.781.781 0 0 1-1.074.258c-2.695-1.656-6.804-2.135-9.99-1.168a.782.782 0 0 1-.456-1.496c3.64-1.104 8.18-.574 11.262 1.332a.781.781 0 0 1 .258 1.074zm.106-2.836C14.69 8.97 9.385 8.793 6.302 9.73a.937.937 0 1 1-.546-1.792c3.536-1.073 9.39-.868 13.116 1.344a.937.937 0 1 1-.956 1.612z',
    svgType: 'standard',
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.18)',
    iconPath: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    svgType: 'standard',
  },
  twitter: {
    name: 'X / Twitter',
    color: '#F0F6FC',
    bgColor: 'rgba(240, 246, 252, 0.15)',
    iconPath: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    svgType: 'standard',
  },
  vk: {
    name: 'VK',
    color: '#0077FF',
    bgColor: 'rgba(0, 119, 255, 0.18)',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.09 11.59c.47.46.96.9 1.41 1.38.18.19.35.39.49.62.2.32.06.77-.28.81h-2.1c-.54.04-1-.17-1.39-.55-.31-.3-.6-.62-.9-1.33-.12-.29-.26-.35-.5-.33-.35.03-.46.33-.46.68v1.17c0 .28-.09.43-.37.47-1.19.16-2.33-.1-3.35-.8-1.07-.74-1.89-1.74-2.61-2.82-1.39-2.09-2.48-4.33-3.48-6.62-.1-.23-.03-.35.23-.36h2.12c.26 0 .43.11.53.35.65 1.58 1.48 3.05 2.5 4.41.22.29.41.34.61.13.25-.26.31-.6.33-.95.03-.83.05-1.65-.07-2.47-.07-.49-.33-.67-.78-.73-.24-.03-.2-.12-.09-.23.19-.18.42-.29.75-.29h2.39c.32.06.39.2.42.52v3.13c0 .18.09.38.25.44.17.07.31-.05.42-.17.75-.82 1.32-1.76 1.84-2.73.16-.3.29-.62.43-.93.09-.2.24-.29.47-.29h2.3c.07 0 .15 0 .22.02.29.07.37.21.28.5-.27.83-.81 1.52-1.32 2.21-.52.71-1.08 1.39-1.6 2.11-.19.26-.17.41.05.64z',
    svgType: 'standard',
  },
  epic: {
    name: 'Epic Games',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.15)',
    iconPath: 'M12 2L4 6v12l8 4 8-4V6l-8-4zm5 11h-4v3l-5-2.5V8.5L13 6v4h4v3z',
    svgType: 'standard',
  },
  blizzard: {
    name: 'Blizzard',
    color: '#00AEFF',
    bgColor: 'rgba(0, 174, 255, 0.18)',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zm0 8l-8-4 8-4 8 4-8 4zm-8 4l8 4 8-4v3l-8 4-8-4v-3zm0 5l8 4 8-4v3l-8 4-8-4v-3z',
    svgType: 'standard',
  },
  bitwarden: {
    name: 'Bitwarden',
    color: '#175DDC',
    bgColor: 'rgba(23, 93, 220, 0.18)',
    iconPath: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4.5c1.93 0 3.5 1.57 3.5 3.5 0 1.3-.7 2.42-1.75 3.03V15h-3.5v-1.97C9.2 12.42 8.5 11.3 8.5 10c0-1.93 1.57-3.5 3.5-3.5z',
    svgType: 'standard',
  },
  proton: {
    name: 'Proton',
    color: '#6D4AFF',
    bgColor: 'rgba(109, 74, 255, 0.18)',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5h2v5zm0-7h-2V7h2v2.5z',
    svgType: 'standard',
  },
  paypal: {
    name: 'PayPal',
    color: '#003087',
    bgColor: 'rgba(0, 48, 135, 0.2)',
    iconPath: 'M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.766a.77.77 0 0 1 .76-.642h7.394c2.812 0 5.037.662 6.265 1.865 1.258 1.233 1.636 2.99 1.124 5.223-.744 3.243-3.13 5.488-6.726 5.488H10.13l-1.63 6.13a.64.64 0 0 1-.633.507h-.791z',
    svgType: 'standard',
  },
};

export interface BrandMeta extends BrandConfig {
  id: string;
}

interface MatchRule {
  id: string;
  keywords: string[];
}

const BRAND_RULES: MatchRule[] = [
  { id: 'openai', keywords: ['openai', 'chatgpt'] },
  { id: 'cryptomus', keywords: ['cryptomus'] },
  { id: 'sony', keywords: ['sony', 'playstation', 'psn'] },
  { id: 'bybit', keywords: ['bybit'] },
  { id: 'majestic', keywords: ['majestic'] },
  { id: 'tiktok', keywords: ['tiktok'] },
  { id: 'jetbrains', keywords: ['jetbrains', 'intellij'] },
  { id: 'instagram', keywords: ['instagram'] },
  { id: 'meta', keywords: ['meta', 'facebook', 'oculus'] },
  { id: 'vercel', keywords: ['vercel'] },
  { id: 'riot', keywords: ['riot', 'valorant', 'league of legends'] },
  { id: 'github', keywords: ['github'] },
  { id: 'discord', keywords: ['discord'] },
  { id: 'binance', keywords: ['binance'] },
  { id: 'telegram', keywords: ['telegram'] },
  { id: 'steam', keywords: ['steam', 'valve'] },
  { id: 'epic', keywords: ['epic games', 'epicgames', 'epic', 'unreal'] },
  { id: 'blizzard', keywords: ['blizzard', 'battle.net', 'battlenet'] },
  { id: 'twitch', keywords: ['twitch'] },
  { id: 'reddit', keywords: ['reddit'] },
  { id: 'spotify', keywords: ['spotify'] },
  { id: 'youtube', keywords: ['youtube'] },
  { id: 'twitter', keywords: ['twitter', 'x.com', 'x corp'] },
  { id: 'vk', keywords: ['vk', 'vkontakte'] },
  { id: 'coinbase', keywords: ['coinbase'] },
  { id: 'amazon', keywords: ['amazon', 'aws'] },
  { id: 'apple', keywords: ['apple', 'icloud'] },
  { id: 'microsoft', keywords: ['microsoft', 'azure', 'xbox', 'office 365', 'office365'] },
  { id: 'bitwarden', keywords: ['bitwarden'] },
  { id: 'proton', keywords: ['proton', 'protonmail'] },
  { id: 'paypal', keywords: ['paypal'] },
  { id: 'dropbox', keywords: ['dropbox'] },
  { id: 'google', keywords: ['google'] },
];

export function getBrandMeta(issuerOrLabel?: string, label?: string): BrandMeta {
  let iss = (issuerOrLabel || '').trim();
  let lbl = (label || '').trim();

  // If label is missing but issuerOrLabel contains "Issuer: Label" or "Issuer (Label)"
  if (!lbl && iss.includes(':')) {
    const parts = iss.split(':');
    iss = parts[0].trim();
    lbl = parts.slice(1).join(':').trim();
  } else if (!lbl && iss.includes('(')) {
    const parts = iss.split('(');
    iss = parts[0].trim();
    lbl = parts.slice(1).join('(').replace(')', '').trim();
  }

  const issLower = iss.toLowerCase();
  const lblLower = lbl.toLowerCase();

  // 1. Primary Priority: Match explicit service in Issuer
  for (const rule of BRAND_RULES) {
    for (const kw of rule.keywords) {
      if (issLower.includes(kw)) {
        return { id: rule.id, ...BRANDS[rule.id] };
      }
    }
  }

  // Handle explicit provider name in issuer
  if (issLower.includes('gmail')) return { id: 'google', ...BRANDS.google };
  if (issLower.includes('outlook') || issLower.includes('hotmail') || issLower.includes('live.com')) {
    return { id: 'microsoft', ...BRANDS.microsoft };
  }
  if (issLower === 'x') return { id: 'twitter', ...BRANDS.twitter };

  // 2. Secondary Priority: Match explicit service in Label (ignoring email domains like @gmail.com)
  for (const rule of BRAND_RULES) {
    // Skip google/microsoft/apple here so user@gmail.com does not trigger service match
    if (rule.id === 'google' || rule.id === 'microsoft' || rule.id === 'apple') continue;
    for (const kw of rule.keywords) {
      if (lblLower.includes(kw)) {
        return { id: rule.id, ...BRANDS[rule.id] };
      }
    }
  }

  // If label contains Google/Microsoft specifically as a name (not an email address)
  if (lblLower.includes('google') && !lblLower.includes('@gmail')) {
    return { id: 'google', ...BRANDS.google };
  }
  if (lblLower.includes('microsoft') && !lblLower.includes('@')) {
    return { id: 'microsoft', ...BRANDS.microsoft };
  }

  // 3. Fallback Priority: Email Domain Match (when no specific service was matched above)
  if (lblLower.endsWith('@gmail.com') || lblLower.endsWith('@googlemail.com') || lblLower.includes('@gmail.com') || lblLower.includes('@googlemail.com')) {
    // Only if issuer is generic or empty
    if (!iss || iss.toLowerCase() === 'google' || iss.toLowerCase() === '2fa') {
      return { id: 'google', ...BRANDS.google };
    }
  }

  if (lblLower.endsWith('@outlook.com') || lblLower.endsWith('@hotmail.com') || lblLower.endsWith('@live.com')) {
    if (!iss || iss.toLowerCase() === 'microsoft' || iss.toLowerCase() === '2fa') {
      return { id: 'microsoft', ...BRANDS.microsoft };
    }
  }

  if (lblLower.endsWith('@icloud.com') || lblLower.endsWith('@me.com')) {
    if (!iss || iss.toLowerCase() === 'apple' || iss.toLowerCase() === '2fa') {
      return { id: 'apple', ...BRANDS.apple };
    }
  }

  if (lblLower.endsWith('@proton.me') || lblLower.endsWith('@protonmail.com')) {
    return { id: 'proton', ...BRANDS.proton };
  }

  // 4. Dynamic colorful palette for unknown / custom services (initials avatar)
  const target = iss || lbl || '2FA';
  const hash = Array.from(target.toLowerCase()).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  const palettes = [
    { color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
    { color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.2)' },
    { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' },
    { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    { color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.2)' },
    { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    { color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.2)' },
    { color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.2)' },
    { color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.2)' },
  ];
  const choice = palettes[Math.abs(hash) % palettes.length];

  return {
    id: 'default',
    name: target,
    color: choice.color,
    bgColor: choice.bgColor,
    iconPath: '',
    svgType: 'standard',
  };
}

export function getBrandConfig(issuer?: string, label?: string): BrandConfig | null {
  const meta = getBrandMeta(issuer, label);
  return meta.id === 'default' ? null : meta;
}
