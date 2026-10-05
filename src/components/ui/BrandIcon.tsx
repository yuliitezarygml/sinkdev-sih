'use client';

import React from 'react';
import { getBrandMeta, getBrandConfig, BrandConfig } from '@/lib/brands';

interface BrandIconProps {
  issuer?: string;
  label?: string;
  size?: number;
}

function renderBrandSvg(brand: BrandConfig, size: number) {
  // Give official logos prominent, full-fidelity sizing
  const iconSize = size;

  switch (brand.svgType) {
    case 'google':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
      );

    case 'github':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#FFFFFF"/>
          <path fill="#181717" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      );

    case 'dropbox':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="#0061FF">
          <path d="M6 3l6 3.8-6 3.8L0 6.8 6 3zm12 0l6 3.8-6 3.8-6-3.8 6-3.8zM0 14.4l6-3.8 6 3.8-6 3.8-6-3.8zm24 0l-6-3.8-6 3.8 6 3.8 6-3.8zM12 15.2l6-3.8-6-3.8-6 3.8 6 3.8zm0 1.9l-6 3.8 6 3.8 6-3.8-6-3.8z"/>
        </svg>
      );

    case 'microsoft':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
          <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
          <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
          <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
        </svg>
      );

    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <defs>
            <radialGradient id="ig-grad-user" cx="0.2" cy="1" r="1">
              <stop offset="0%" stopColor="#FFDD55"/>
              <stop offset="30%" stopColor="#FF543E"/>
              <stop offset="60%" stopColor="#C837AB"/>
              <stop offset="100%" stopColor="#3771C8"/>
            </radialGradient>
          </defs>
          <rect width="20" height="20" x="2" y="2" rx="5.5" ry="5.5" fill="none" stroke="url(#ig-grad-user)" strokeWidth="2.3"/>
          <circle cx="12" cy="12" r="4.6" fill="none" stroke="url(#ig-grad-user)" strokeWidth="2.3"/>
          <circle cx="17.2" cy="6.8" r="1.3" fill="#FF543E"/>
        </svg>
      );

    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="none">
          <rect width="24" height="24" rx="6" fill="#000000"/>
          <path
            d="M12.5 3v11a3 3 0 1 1-3-3c.3 0 .6.04.9.13V7a6.2 6.2 0 0 0-.9-.08A6 6 0 1 0 15.5 13V7.2a7.3 7.3 0 0 0 4.3 1.5V5.7a4.6 4.6 0 0 1-3-2.7h-4.3z"
            fill="#FE2C55"
          />
          <path
            d="M11.6 2.2v11a3 3 0 1 1-3-3c.3 0 .6.04.9.13V6.2a6.2 6.2 0 0 0-.9-.08A6 6 0 1 0 14.6 12.2V6.4a7.3 7.3 0 0 0 4.3 1.5V4.9a4.6 4.6 0 0 1-3-2.7h-4.3z"
            fill="#25F4EE"
            opacity="0.88"
          />
        </svg>
      );

    case 'openai':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#10A37F"/>
          <path fill="#FFFFFF" d="M19.5 9.7a4.6 4.6 0 0 0-.4-3.8 4.7 4.7 0 0 0-4.8-2.3 4.6 4.6 0 0 0-3.5-1.6 4.7 4.7 0 0 0-4.5 3.3 4.6 4.6 0 0 0-2.9 2.5 4.7 4.7 0 0 0 .7 5.3 4.6 4.6 0 0 0 .4 3.8 4.7 4.7 0 0 0 4.8 2.3 4.6 4.6 0 0 0 3.5 1.6 4.7 4.7 0 0 0 4.5-3.3 4.6 4.6 0 0 0 2.9-2.5 4.7 4.7 0 0 0-.7-5.3zm-1.5 4.4a3.5 3.5 0 0 1-1.9 1.1v-2.9l2.9-1.7a3.5 3.5 0 0 1-1 3.5zm-4.6 3.4a3.5 3.5 0 0 1-2.2.3v-3.3l2.9 1.7a3.5 3.5 0 0 1-.7 1.3zm-4.9-1.1a3.5 3.5 0 0 1-.3-2.2l2.9-1.7v3.3a3.5 3.5 0 0 1-2.6.6zm-2.9-4.4a3.5 3.5 0 0 1 1.9-1.1v2.9L3.6 15.5a3.5 3.5 0 0 1 1-3.5zm4.6-3.4a3.5 3.5 0 0 1 2.2-.3v3.3L7.9 9.9a3.5 3.5 0 0 1 .7-1.3zm4.9 1.1a3.5 3.5 0 0 1 .3 2.2l-2.9 1.7V7.3a3.5 3.5 0 0 1 2.6-.6z"/>
        </svg>
      );

    case 'bybit':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#181A1E"/>
          <path fill="#F7A600" d="M7 6h5.5c2 0 3.5 1.2 3.5 2.8 0 1-.5 1.8-1.3 2.3 1.1.5 1.8 1.4 1.8 2.7 0 1.9-1.6 3.2-3.8 3.2H7V6zm3 4.5h2.6c.8 0 1.4-.5 1.4-1.1s-.6-1.1-1.4-1.1H10v2.2zm0 4.2h3c.9 0 1.5-.5 1.5-1.2s-.6-1.2-1.5-1.2H10v2.4z"/>
        </svg>
      );

    case 'sony':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#00439C"/>
          <path fill="#FFFFFF" d="M8.5 16.5V6.8l4.2-1.4v11.1zm4.7-5.5c-1.5-.5-2.1-1-2.1-1.8 0-.9.9-1.4 2.2-1.4 1.4 0 2.7.5 3.5 1.1l1.5-2.3c-1.3-.9-3.1-1.4-5-1.4-3.5 0-5.8 2-5.8 4.7 0 2.5 2 3.8 4.7 4.5 1.6.4 2.2 1 2.2 1.8 0 1-.9 1.5-2.4 1.5-1.7 0-3.3-.6-4.3-1.4L6.2 18c1.5 1.2 3.6 1.9 5.8 1.9 4 0 6.2-2.1 6.2-4.8 0-2.6-2.1-3.8-5-4.5z"/>
        </svg>
      );

    case 'jetbrains':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <rect x="1" y="1" width="22" height="22" rx="4.5" fill="#000000"/>
          <rect x="4" y="17" width="9" height="2.5" fill="#FC801D"/>
          <text x="4.5" y="13" fill="#FFFFFF" fontSize="8.5" fontWeight="900" fontFamily="sans-serif">_JB</text>
        </svg>
      );

    case 'meta':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#0081FB"/>
          <path fill="#FFFFFF" d="M16.9 8.2c-1.3 0-2.4.7-3.2 1.7-.3.4-.7 1-1 1.6-.3-.6-.7-1.2-1-1.6-.8-1-1.9-1.7-3.2-1.7-2.3 0-4.2 1.9-4.2 4.3s1.9 4.3 4.2 4.3c1.4 0 2.6-.8 3.3-1.9.3-.3.5-.8.9-1.3.3.5.6.9.9 1.3.7 1.1 1.9 1.9 3.3 1.9 2.3 0 4.2-1.9 4.2-4.3s-1.9-4.3-4.2-4.3zm-8.4 6.8c-1.4 0-2.6-1.1-2.6-2.6s1.1-2.6 2.6-2.6c.9 0 1.6.4 2.1 1.1.3.5.8 1.2 1.2 2-.5.9-1.1 2.1-3.3 2.1zm8.4 0c-2.1 0-2.8-1.1-3.3-2.1.4-.8.9-1.5 1.2-2 .5-.7 1.2-1.1 2.1-1.1 1.4 0 2.6 1.1 2.6 2.6s-1.2 2.6-2.6 2.6z"/>
        </svg>
      );

    case 'vercel':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#000000" stroke="#2a475e" strokeWidth="1"/>
          <polygon points="12,6 19,18 5,18" fill="#FFFFFF"/>
        </svg>
      );

    case 'riot':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <rect width="24" height="24" rx="6" fill="#EB0029"/>
          <path fill="#FFFFFF" d="M13.4 4.2L3.7 8.6l3.1 11 3.2-1.3-.6-4.3 2.1-.9-.6-4.3 2.1-.9-.6-4.3 3.8-1.5-3 2.1zM20.5 9.8l-4 1.6 1.3 9.4 4-1.7-1.3-9.3z"/>
        </svg>
      );

    case 'cryptomus':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#00C288"/>
          <path fill="#FFFFFF" d="M12 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm2.8 10.8a4.4 4.4 0 0 1-2.9 1 4.3 4.3 0 0 1-4.3-4.3 4.3 4.3 0 0 1 4.3-4.3 4.4 4.4 0 0 1 2.9 1l-1.1 1.4a2.6 2.6 0 0 0-1.8-.6 2.6 2.6 0 0 0-2.6 2.6 2.6 2.6 0 0 0 2.6 2.6 2.6 2.6 0 0 0 1.8-.6z"/>
        </svg>
      );

    case 'majestic':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#201C14"/>
          <path fill="#F59E0B" d="M5 17L3 7.5l5 3.2 4-4.8 4 4.8 5-3.2-2 9.5H5zm12.5-.9l1.4-6.6-3.6 2.3-3.3-4-3.3 4-3.6-2.3 1.4 6.6h11z"/>
        </svg>
      );

    case 'steam':
      return (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <circle cx="12" cy="12" r="11" fill="#171A21"/>
          <path fill="#66C0F4" d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.95l-2.3-1.65a3.25 3.25 0 0 1-1.12-2.92l-4.14-1.7a10.02 10.02 0 0 1 1.06-2.52l4.9 2.01c.7-.44 1.53-.7 2.42-.7a4.25 4.25 0 0 1 4.25 4.25c0 .35-.04.7-.13 1.03l3.6 2.57A4.24 4.24 0 0 1 20.25 12c0 2.35-1.9 4.25-4.25 4.25a4.24 4.24 0 0 1-2.93-1.17l-3.07 2.2V21.8c.65.13 1.32.2 2 .2 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
      );

    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={brand.color}
        >
          <path d={brand.iconPath} />
        </svg>
      );
  }
}

export const BrandIcon: React.FC<BrandIconProps> = ({ issuer, label, size = 38 }) => {
  const brand = getBrandConfig(issuer, label);

  if (brand) {
    return (
      <div
        className="flex items-center justify-center shrink-0 drop-shadow select-none"
        style={{
          width: size,
          height: size,
        }}
        title={brand.name}
      >
        {renderBrandSvg(brand, size)}
      </div>
    );
  }

  // Fallback: stylish colorful dynamic avatar with initials
  const meta = getBrandMeta(issuer, label);
  const initials = issuer
    ? issuer.trim().slice(0, 2).toUpperCase()
    : label
    ? label.trim().slice(0, 2).toUpperCase()
    : '2F';

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-inner select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: meta.bgColor,
        color: meta.color,
      }}
      title={meta.name}
    >
      {initials}
    </div>
  );
};
