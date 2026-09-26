import React, { useState } from 'react';
import { Sparkles, Command, Barcode, Shield } from 'lucide-react';
import CommandPalette from './CommandPalette';
import DailyBriefModal from './DailyBriefModal';
import BarcodeScannerModal from './BarcodeScannerModal';

export default function Topbar({ title, children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('MANAGER');

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

          {/* Role selector switcher (Feature 19) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Shield size={14} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto', background: '#F8FAFC' }}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="MANAGER">Manager View</option>
              <option value="OPERATOR">Warehouse Operator</option>
              <option value="EXECUTIVE">Executive Admin</option>
            </select>
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
