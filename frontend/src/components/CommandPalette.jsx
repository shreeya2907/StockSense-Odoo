import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  History,
  Sparkles,
  Barcode,
  HelpCircle,
  Building,
} from 'lucide-react';
import api from '../api/axiosInstance';

export default function CommandPalette({ isOpen, onClose, onOpenCopilot, onOpenDailyBrief }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Fetch products for quick search
      api
        .get('/products')
        .then((res) => setProducts(res.data))
        .catch(() => {});
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false); // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Inventory Dashboard', path: '/dashboard', icon: Building, section: 'Navigation' },
    { label: 'Product Catalog', path: '/products', icon: Package, section: 'Navigation' },
    { label: 'Inbound Receipts (Stock In)', path: '/receipts', icon: ArrowDownToLine, section: 'Navigation' },
    { label: 'Outbound Deliveries (Stock Out)', path: '/deliveries', icon: ArrowUpFromLine, section: 'Navigation' },
    { label: 'Internal Transfers', path: '/transfers', icon: ArrowLeftRight, section: 'Navigation' },
    { label: 'Physical Adjustments', path: '/adjustments', icon: ClipboardList, section: 'Navigation' },
    { label: 'Stock Movement Ledger', path: '/movements', icon: History, section: 'Navigation' },
    { label: 'AI Intelligence Hub', path: '/intelligence', icon: Sparkles, section: 'AI Features' },
    { label: 'Warehouse Digital Twin & Heatmap', path: '/intelligence?tab=twin', icon: Building, section: 'AI Features' },
    { label: 'Predictive Stockouts & Simulator', path: '/intelligence?tab=predictive', icon: Sparkles, section: 'AI Features' },
    { label: 'Inventory Detective', path: '/intelligence?tab=detective', icon: HelpCircle, section: 'AI Features' },
    { label: 'Barcode & QR Scanner', path: '/intelligence?tab=barcode', icon: Barcode, section: 'AI Features' },
  ];

  const filteredNav = quickNav.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={20} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or product SKU... (ESC to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              background: '#F1F5F9',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              border: '1px solid #CBD5E1',
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px' }}>
          {filteredNav.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                }}
              >
                Quick Actions & Pages
              </div>
              {filteredNav.slice(0, 6).map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectNav(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon size={16} color="var(--primary)" />
                    <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Jump</span>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                }}
              >
                Products Matching ({filteredProducts.length})
              </div>
              {filteredProducts.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectNav('/products')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={16} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <code style={{ fontSize: '0.78rem', background: '#F1F5F9', padding: '1px 5px' }}>
                      {p.sku}
                    </code>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {p.onHand} in stock
                  </span>
                </div>
              ))}
            </div>
          )}

          {filteredNav.length === 0 && filteredProducts.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
