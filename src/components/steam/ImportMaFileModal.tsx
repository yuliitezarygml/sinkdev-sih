'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { importMaFile, importBatchMafiles } from '@/lib/tauri';
import { usePreferences } from '../providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

interface ParsedMafileSummary {
  fileName: string;
  accountName: string;
  steamId: string;
  rawContent: string;
  isValid: boolean;
  error?: string;
}

export const ImportMaFileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = usePreferences();
  const [parsedFiles, setParsedFiles] = useState<ParsedMafileSummary[]>([]);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | File[]) => {
    setError(null);
    setStatusMessage(null);
    triggerHaptic('light');

    const files = Array.from(fileList);
    if (files.length === 0) return;

    const summaries: ParsedMafileSummary[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const accountName = json.account_name || 'Unknown Account';
        const steamId = String(json.Session?.SteamID || json.steamid || 'Unknown');
        const hasSharedSecret = !!json.shared_secret;

        if (!hasSharedSecret) {
          summaries.push({
            fileName: file.name,
            accountName,
            steamId,
            rawContent: text,
            isValid: false,
            error: 'Missing shared_secret in .maFile',
          });
        } else {
          summaries.push({
            fileName: file.name,
            accountName,
            steamId,
            rawContent: text,
            isValid: true,
          });
        }
      } catch (err) {
        summaries.push({
          fileName: file.name,
          accountName: 'Invalid file',
          steamId: '-',
          rawContent: '',
          isValid: false,
          error: 'JSON parsing failed',
        });
      }
    }

    setParsedFiles(summaries);
    triggerHaptic(summaries.some(s => s.isValid) ? 'success' : 'warning');
  };

  const handleImport = async () => {
    const valid = parsedFiles.filter(f => f.isValid);
    if (valid.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      if (valid.length === 1) {
        await importMaFile(valid[0].rawContent);
        triggerHaptic('success');
        onSuccess();
        handleClose();
      } else {
        const contents = valid.map(f => f.rawContent);
        const res = await importBatchMafiles(contents);
        triggerHaptic('success');
        setStatusMessage(`${t.import_success} ${res.imported} accounts. (${res.failed} ${t.duplicates_skipped})`);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1200);
      }
    } catch (err) {
      triggerHaptic('error');
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedFiles([]);
    setError(null);
    setStatusMessage(null);
    onClose();
  };

  const validCount = parsedFiles.filter(f => f.isValid).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.import_mafile}>
      <div className="space-y-4">
        {/* Upload Zone with Multiple File Support */}
        <div
          className="border-2 border-dashed border-[#2a475e] hover:border-[#1a9fff] rounded-xl p-6 text-center bg-[#171a21]/60 hover:bg-[#171a21] transition-all cursor-pointer"
          onClick={() => document.getElementById('mafile-batch-upload')?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            id="mafile-batch-upload"
            className="hidden"
            multiple
            accept=".maFile,.json"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <div className="w-12 h-12 rounded-2xl bg-[#1b2838] border border-[#2a475e] text-[#66c0f4] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm">
            {t.batch_import_mafiles}
          </p>
          <p className="text-[#8f98a0] text-xs mt-1">
            {t.batch_import_desc}
          </p>
        </div>

        {error && (
          <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-2.5 rounded-xl">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800 p-2.5 rounded-xl font-medium">
            {statusMessage}
          </div>
        )}

        {/* Parsed Accounts Preview List */}
        {parsedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8f98a0]">
              <span>
                {validCount} {t.accounts_found}
              </span>
              <button
                type="button"
                onClick={() => setParsedFiles([])}
                className="text-rose-400 hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {parsedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    file.isValid
                      ? 'bg-[#1b2838] border-[#2a475e]'
                      : 'bg-rose-950/30 border-rose-900 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        file.isValid
                          ? 'bg-[#5c7e10]/20 text-[#a4d007] border border-[#5c7e10]'
                          : 'bg-rose-900/40 text-rose-400'
                      }`}
                    >
                      {file.isValid ? '✓' : '!'}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">
                        {file.accountName}
                      </p>
                      <p className="text-[10px] text-[#8f98a0] font-mono truncate">
                        {file.isValid ? file.steamId : file.error}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleImport}
          disabled={validCount === 0 || importing}
          className="w-full bg-[#5c7e10] hover:bg-[#6c9513] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2"
        >
          {importing ? (
            <span>Importing...</span>
          ) : (
            <span>
              {validCount > 1
                ? `${t.import_all} (${validCount})`
                : t.import_mafile}
            </span>
          )}
        </button>
      </div>
    </Modal>
  );
};
