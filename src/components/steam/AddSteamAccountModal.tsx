'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { addSteamAccount } from '@/lib/tauri';

export const AddSteamAccountModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    account_name: '',
    steam_id: '',
    shared_secret: '',
    identity_secret: '',
    revocation_code: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addSteamAccount({
        ...formData,
        device_id: 'android:' + crypto.randomUUID()
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Steam Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-steam-muted mb-1">Account Name</label>
          <input required type="text" className="w-full bg-steam-surface border border-steam-bg rounded p-2 text-steam-text focus:outline-none focus:border-steam-accent" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-steam-muted mb-1">Steam ID</label>
          <input required type="text" className="w-full bg-steam-surface border border-steam-bg rounded p-2 text-steam-text focus:outline-none focus:border-steam-accent" value={formData.steam_id} onChange={e => setFormData({...formData, steam_id: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-steam-muted mb-1">Shared Secret</label>
          <input required type="text" className="w-full bg-steam-surface border border-steam-bg rounded p-2 text-steam-text focus:outline-none focus:border-steam-accent" value={formData.shared_secret} onChange={e => setFormData({...formData, shared_secret: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-steam-muted mb-1">Identity Secret</label>
          <input required type="text" className="w-full bg-steam-surface border border-steam-bg rounded p-2 text-steam-text focus:outline-none focus:border-steam-accent" value={formData.identity_secret} onChange={e => setFormData({...formData, identity_secret: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-steam-muted mb-1">Revocation Code</label>
          <input required type="text" className="w-full bg-steam-surface border border-steam-bg rounded p-2 text-steam-text focus:outline-none focus:border-steam-accent" value={formData.revocation_code} onChange={e => setFormData({...formData, revocation_code: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-steam-accent hover:bg-blue-500 text-white font-medium py-2 px-4 rounded transition-colors mt-6">
          Add Account
        </button>
      </form>
    </Modal>
  );
};
