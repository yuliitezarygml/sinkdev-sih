'use client';

import React from 'react';
import { getBrandConfig } from '@/lib/brands';

interface BrandIconProps {
  issuer?: string;
  label?: string;
  size?: number;
}

export const BrandIcon: React.FC<BrandIconProps> = ({ issuer, label, size = 40 }) => {
  const brand = getBrandConfig(issuer, label);

  if (brand) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 shadow-inner transition-transform"
        style={{
          width: size,
          height: size,
          backgroundColor: brand.bgColor,
          border: `1.5px solid ${brand.color}40`,
        }}
        title={brand.name}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill={brand.color}
        >
          <path d={brand.iconPath} />
        </svg>
      </div>
    );
  }

  // Fallback avatar
  const initials = issuer
    ? issuer.slice(0, 2).toUpperCase()
    : label
    ? label.slice(0, 2).toUpperCase()
    : '2F';

  return (
    <div
      className="rounded-full bg-[#121c27] border border-[#2a475e] flex items-center justify-center shrink-0 text-[#66c0f4] shadow-inner font-bold text-xs"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
};
