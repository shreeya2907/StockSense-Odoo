import React, { useState } from 'react';
import { Sparkles, Command, Barcode, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import DailyBriefModal from './DailyBriefModal';
import BarcodeScannerModal from './BarcodeScannerModal';

export default function Topbar({ title, children }) {
  const { user } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">{title}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Global Command Palette search shortcut */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPaletteOpen(true)}
            style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Command size={14} />
            <span>Search or jump...</span>
            <kbd
              style={{
                background: '#F1F5F9',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                border: '1px solid #CBD5E1',
              }}
            >
              Ctrl+K
            </kbd>
          </button>

          {/* Barcode scanner button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setScannerOpen(true)}
            title="Scan Barcode / QR"
          >
            <Barcode size={15} />
            <span style={{ display: 'none', md: 'inline' }}>Scan Barcode</span>
          </button>

          {/* AI Daily Brief button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setBriefOpen(true)}
            style={{
              background: '#EEF2FF',
              borderColor: '#C7D2FE',
              color: '#4F46E5',
              fontWeight: 600,
            }}
          >
            <Sparkles size={15} /> AI Daily Brief
          </button>

          {/* Live RBAC Role Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: user?.role === 'MANAGER' ? '#EEF2FF' : '#F1F5F9',
              color: user?.role === 'MANAGER' ? '#4338CA' : '#475569',
              border: `1px solid ${user?.role === 'MANAGER' ? '#C7D2FE' : '#CBD5E1'}`,
            }}
            title={user?.role === 'MANAGER' ? 'Manager Role: Full Validation & Catalog Control' : 'Staff Role: Operations & Scanning Access'}
          >
            <Shield size={14} color={user?.role === 'MANAGER' ? '#4F46E5' : '#64748B'} />
            <span>{user?.role === 'MANAGER' ? '👑 Inventory Manager' : '👤 Warehouse Staff'}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
              ({user?.name || user?.loginId || 'User'})
            </span>
          </div>

          {children}
        </div>
      </header>

      {/* Global Modals */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <DailyBriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
      <BarcodeScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </>
  );
}
