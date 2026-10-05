'use client';

import Image from 'next/image';
import { getBrandMeta } from '@/lib/brands';

interface BrandIconProps {
  issuer?: string;
  label?: string;
  size?: number;
}

function getInitials(issuer?: string, label?: string): string {
  const source = issuer?.trim() || label?.trim() || '2FA';
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function BrandIcon({ issuer, label, size = 38 }: BrandIconProps) {
  const brand = getBrandMeta(issuer, label);

  if (brand.iconPath) {
    return (
      <div
        className="flex shrink-0 select-none items-center justify-center drop-shadow"
        style={{ width: size, height: size }}
        title={brand.name}
      >
        <Image
          src={brand.iconPath}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="rounded-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 select-none items-center justify-center rounded-full text-xs font-bold shadow-inner"
      style={{
        width: size,
        height: size,
        backgroundColor: brand.bgColor,
        color: brand.color,
      }}
      title={brand.name}
    >
      {getInitials(issuer, label)}
    </div>
  );
}
