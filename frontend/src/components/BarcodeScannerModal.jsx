import React, { useState, useEffect } from 'react';
import { Barcode, QrCode, Package, MapPin, ArrowRight, Check } from 'lucide-react';
import Modal from './Modal';
import api from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function BarcodeScannerModal({ isOpen, onClose }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      api.get('/products').then((res) => {
        setProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProduct(res.data[0]);
          setScannedCode(res.data[0].sku);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanInput = (e) => {
    const val = e.target.value;
    setScannedCode(val);
    const matched = products.find(
      (p) => p.sku.toLowerCase() === val.toLowerCase() || p.name.toLowerCase().includes(val.toLowerCase())
    );
    if (matched) setSelectedProduct(matched);
  };

  const handleSelectQuick = (p) => {
    setSelectedProduct(p);
    setScannedCode(p.sku);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & QR Intelligence Scanner"
      maxWidth="620px"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close Scanner
        </button>
      }
    >
      <div>
        <div className="form-group">
          <label className="form-label">Scan Barcode / Enter SKU</label>
          <div style={{ position: 'relative' }}>
            <Barcode
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', fontWeight: 600 }}
              placeholder="e.g. RAW-STL-001 or scan barcode..."
              value={scannedCode}
              onChange={handleScanInput}
              autoFocus
            />
          </div>
        </div>

        {/* Quick select chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '18px', paddingBottom: '4px' }}>
          {products.slice(0, 5).map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                background: selectedProduct?.id === p.id ? '#EEF2FF' : '#FFFFFF',
                borderColor: selectedProduct?.id === p.id ? '#6366F1' : 'var(--border)',
              }}
              onClick={() => handleSelectQuick(p)}
            >
              {p.sku}
            </button>
          ))}
        </div>

        {selectedProduct ? (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            {/* Barcode visual generator representation */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: '5px',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  transform: 'scaleY(1.3)',
                }}
              >
                ||| | |||| | ||| || |||
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                *{selectedProduct.sku}*
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Product:</span>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedProduct.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total On Hand:</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  {selectedProduct.onHand} {selectedProduct.uom}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Category:</span>
                <div>{selectedProduct.categoryName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Unit Cost:</span>
                <div style={{ fontWeight: 600 }}>${Number(selectedProduct.unitCost).toFixed(2)}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Stored Shelf Locations:
              </div>
              {selectedProduct.stocks?.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    {st.warehouse?.code} — {st.location?.name}
                  </span>
                  <strong>{st.quantity} units</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  navigate('/receipts');
                }}
              >
                Inbound Receive
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  navigate('/transfers');
                }}
              >
                Relocate Stock
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  navigate('/adjustments');
                }}
              >
                Physical Audit
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Scan a barcode or type a SKU to decode product details
          </div>
        )}
      </div>
    </Modal>
  );
}
