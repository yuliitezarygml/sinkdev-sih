'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { addTotpAccount, parseOtpauthUri, isTauri, import2FasBackup } from '@/lib/tauri';
import { usePreferences } from '../providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';
import jsQR from 'jsqr';

interface AddTotpAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'scan' | 'uri' | 'manual' | '2fas';
}

export const AddTotpAccountModal: React.FC<AddTotpAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'scan',
}) => {
  const { t } = usePreferences();
  const [mode, setMode] = useState<'scan' | 'uri' | 'manual' | '2fas'>(initialMode);
  const [uri, setUri] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2FAS File state
  const [twoFasFileName, setTwoFasFileName] = useState('');
  const [twoFasContent, setTwoFasContent] = useState('');
  const [twoFasLoading, setTwoFasLoading] = useState(false);
  const [twoFasMsg, setTwoFasMsg] = useState('');
  const twoFasFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    issuer: '',
    label: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setScanError(null);
      setTwoFasFileName('');
      setTwoFasContent('');
      setTwoFasMsg('');
    }
  }, [isOpen, initialMode]);

  const handleNativeScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      if (isTauri()) {
        const { scan, Format, requestPermissions } = await import('@tauri-apps/plugin-barcode-scanner');
        await requestPermissions();
        const res = await scan({ windowed: false, formats: [Format.QRCode] });
        if (res && res.content) {
          await parseOtpauthUri(res.content);
          triggerHaptic('success');
          onSuccess();
          onClose();
          return;
        }
      } else {
        // In browser, trigger file upload for QR image
        fileInputRef.current?.click();
      }
    } catch (err: unknown) {
      console.warn('Native scan error:', err);
      setScanError('Camera scanner not available on this device. Try uploading a QR image or entering URI.');
    } finally {
      setScanning(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          try {
            await parseOtpauthUri(code.data);
            triggerHaptic('success');
            onSuccess();
            onClose();
          } catch (err) {
            setScanError(`Scanned code is not a valid 2FA URI: ${err}`);
          }
        } else {
          setScanError('Could not find a valid QR code in the uploaded image.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handle2FasFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTwoFasFileName(file.name);
    setTwoFasMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setTwoFasContent(reader.result as string);
      triggerHaptic('light');
    };
    reader.readAsText(file);
  };

  const handleImport2Fas = async () => {
    if (!twoFasContent.trim()) return;
    setTwoFasLoading(true);
    setTwoFasMsg('');
    try {
      const added = await import2FasBackup(twoFasContent.trim());
      triggerHaptic('success');
      setTwoFasMsg(`✓ ${added.length} ${t.imported_2fas_count}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      triggerHaptic('error');
      const msg = err instanceof Error ? err.message : String(err);
      setTwoFasMsg(`Import error: ${msg}`);
    } finally {
      setTwoFasLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'uri') {
        await parseOtpauthUri(uri.trim());
      } else {
        await addTotpAccount({
          issuer: formData.issuer.trim(),
          label: formData.label.trim(),
          secret: formData.secret.trim().replace(/\s/g, '').toUpperCase(),
          algorithm: formData.algorithm,
          digits: Number(formData.digits),
          period: Number(formData.period),
        });
      }
      triggerHaptic('success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      triggerHaptic('error');
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to add 2FA account: ${msg}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add 2FA Account">
      {/* Mode Switcher */}
      <div className="flex gap-1 mb-4 bg-steam-surface p-1 rounded-lg">
        <button
          type="button"
          className={`flex-1 py-1.5 text-[11px] rounded font-medium transition-colors ${
            mode === 'scan' ? 'bg-steam-card text-steam-accent shadow-sm' : 'text-steam-muted hover:text-steam-text'
          }`}
          onClick={() => {
            setMode('scan');
            triggerHaptic('light');
          }}
        >
          Scan QR
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 text-[11px] rounded font-medium transition-colors ${
            mode === 'uri' ? 'bg-steam-card text-steam-accent shadow-sm' : 'text-steam-muted hover:text-steam-text'
          }`}
          onClick={() => {
            setMode('uri');
            triggerHaptic('light');
          }}
        >
          From URI
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 text-[11px] rounded font-medium transition-colors ${
            mode === 'manual' ? 'bg-steam-card text-steam-accent shadow-sm' : 'text-steam-muted hover:text-steam-text'
          }`}
          onClick={() => {
            setMode('manual');
            triggerHaptic('light');
          }}
        >
          Manual
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 text-[11px] rounded font-medium transition-colors ${
            mode === '2fas' ? 'bg-steam-card text-[#66c0f4] shadow-sm font-semibold' : 'text-steam-muted hover:text-steam-text'
          }`}
          onClick={() => {
            setMode('2fas');
            triggerHaptic('light');
          }}
        >
          .2FAS File
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="flex flex-col items-center justify-center p-6 bg-steam-surface/50 border border-steam-surface rounded-xl space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="w-16 h-16 rounded-full bg-steam-card flex items-center justify-center text-steam-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <rect x="7" y="7" width="3" height="3" />
              <rect x="14" y="7" width="3" height="3" />
              <rect x="7" y="14" width="3" height="3" />
              <line x1="14" y1="14" x2="14" y2="14.01" />
              <line x1="14" y1="17" x2="17" y2="17" />
              <line x1="17" y1="14" x2="17" y2="14.01" />
            </svg>
          </div>

          <div className="text-center">
            <h4 className="text-sm font-semibold text-steam-text">Scan 2FA QR Code</h4>
            <p className="text-xs text-steam-muted mt-1 max-w-[260px]">
              Use your device camera or upload a QR image from Google, GitHub, Discord, etc.
            </p>
          </div>

          {scanError && (
            <div className="p-2.5 bg-steam-red/20 border border-steam-red/40 rounded text-xs text-red-200 text-center max-w-full">
              {scanError}
            </div>
          )}

          <div className="flex flex-col w-full gap-2 pt-2">
            <button
              type="button"
              onClick={handleNativeScan}
              disabled={scanning}
              className="w-full py-2.5 bg-steam-accent hover:bg-blue-500 text-white font-medium rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>{scanning ? 'Scanning...' : 'Scan with Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-steam-card hover:bg-steam-surface text-steam-text font-medium rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors border border-steam-surface"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload QR Image</span>
            </button>
          </div>
        </div>
      ) : mode === '2fas' ? (
        <div className="space-y-4">
          <p className="text-xs text-steam-muted">
            {t.import_2fas_desc}
          </p>

          <div
            className="border-2 border-dashed border-[#2a475e] hover:border-[#1a9fff] rounded-xl p-5 text-center bg-[#171a21]/60 cursor-pointer transition-colors"
            onClick={() => twoFasFileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={twoFasFileInputRef}
              className="hidden"
              accept=".2fas,.json"
              onChange={handle2FasFileChange}
            />
            <div className="w-12 h-12 rounded-full bg-[#1b2838] border border-[#2a475e] flex items-center justify-center text-[#66c0f4] mx-auto mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-white">
              {twoFasFileName ? `✓ ${twoFasFileName}` : t.select_2fas_file}
            </p>
            <p className="text-[11px] text-[#8f98a0] mt-1">
              Supports 2FAS Authenticator export files (.2fas / JSON)
            </p>
          </div>

          {twoFasMsg && (
            <div className={`p-2.5 rounded-xl border text-xs text-center ${
              twoFasMsg.startsWith('✓') ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              {twoFasMsg}
            </div>
          )}

          <button
            type="button"
            disabled={!twoFasContent || twoFasLoading}
            onClick={handleImport2Fas}
            className="w-full bg-[#5c7e10] hover:bg-[#6c9513] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
          >
            {twoFasLoading ? 'Importing...' : t.import_2fas_btn}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'uri' ? (
            <div>
              <label className="block text-xs font-medium text-steam-muted mb-1">
                otpauth:// URI
              </label>
              <textarea
                required
                rows={4}
                className="w-full bg-steam-surface border border-steam-card rounded p-2.5 text-xs text-steam-text font-mono focus:outline-none focus:border-steam-accent"
                value={uri}
                onChange={e => setUri(e.target.value)}
                placeholder="otpauth://totp/Example:user@email.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-steam-muted mb-1">Issuer</label>
                <input
                  required
                  type="text"
                  className="w-full bg-steam-surface border border-steam-card rounded px-3 py-2 text-xs text-steam-text focus:outline-none focus:border-steam-accent"
                  value={formData.issuer}
                  onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                  placeholder="e.g. GitHub, Google, Epic Games"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-steam-muted mb-1">Account / Email</label>
                <input
                  required
                  type="text"
                  className="w-full bg-steam-surface border border-steam-card rounded px-3 py-2 text-xs text-steam-text focus:outline-none focus:border-steam-accent"
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. user@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-steam-muted mb-1">Secret Key (Base32)</label>
                <input
                  required
                  type="text"
                  className="w-full bg-steam-surface border border-steam-card rounded px-3 py-2 text-xs text-steam-text font-mono focus:outline-none focus:border-steam-accent uppercase tracking-wider"
                  value={formData.secret}
                  onChange={e => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="JBSWY3DPEHPK3PXP"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-steam-muted mb-1">Algorithm</label>
                  <select
                    className="w-full bg-steam-surface border border-steam-card rounded p-1.5 text-xs text-steam-text focus:outline-none focus:border-steam-accent"
                    value={formData.algorithm}
                    onChange={e => setFormData({ ...formData, algorithm: e.target.value })}
                  >
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-steam-muted mb-1">Digits</label>
                  <select
                    className="w-full bg-steam-surface border border-steam-card rounded p-1.5 text-xs text-steam-text focus:outline-none focus:border-steam-accent"
                    value={formData.digits}
                    onChange={e => setFormData({ ...formData, digits: parseInt(e.target.value, 10) })}
                  >
                    <option value="6">6</option>
                    <option value="8">8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-steam-muted mb-1">Period</label>
                  <select
                    className="w-full bg-steam-surface border border-steam-card rounded p-1.5 text-xs text-steam-text focus:outline-none focus:border-steam-accent"
                    value={formData.period}
                    onChange={e => setFormData({ ...formData, period: parseInt(e.target.value, 10) })}
                  >
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-steam-accent hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition-colors mt-4"
          >
            Add 2FA Account
          </button>
        </form>
      )}
    </Modal>
  );
};
