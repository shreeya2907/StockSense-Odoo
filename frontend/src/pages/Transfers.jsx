import React, { useState, useEffect } from 'react';
import { Plus, Check, Eye, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
  const [creating, setCreating] = useState(false);

  // View Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Validate confirmation
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    type: null,
    transferId: null,
    loading: false,
  });

  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const toast = useToast();

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transfers', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setTransfers(res.data);
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [whRes, locRes, prodRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/locations'),
        api.get('/products'),
      ]);
      setWarehouses(whRes.data);
      setLocations(locRes.data);
      setProducts(prodRes.data);
      if (whRes.data.length > 0) {
        setSourceWarehouseId(whRes.data[0].id);
        setDestWarehouseId(whRes.data[0].id);
        const whLocs = locRes.data.filter((l) => l.warehouseId === whRes.data[0].id);
        if (whLocs.length > 0) {
          setSourceLocationId(whLocs[0].id);
          setDestLocationId(whLocs[1]?.id || whLocs[0].id);
        }
      }
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    const defaultWh = warehouses[0]?.id || '';
    setSourceWarehouseId(defaultWh);
    setDestWarehouseId(defaultWh);
    const whLocs = locations.filter((l) => l.warehouseId === defaultWh);
    setSourceLocationId(whLocs[0]?.id || '');
    setDestLocationId(whLocs[1]?.id || whLocs[0]?.id || '');
    setItems([{ productId: products[0]?.id || '', quantity: 1 }]);
    setCreateModalOpen(true);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 1 }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      toast.warning('Transfer must have at least one product line');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (sourceLocationId === destLocationId) {
      toast.error('Source and destination locations cannot be identical');
      return;
    }
    for (const it of items) {
      if (!it.productId || Number(it.quantity) <= 0) {
        toast.error('All lines must have a product and positive quantity');
        return;
      }
    }

    setCreating(true);
    try {
      const res = await api.post('/transfers', {
        sourceWarehouseId,
        sourceLocationId,
        destWarehouseId,
        destLocationId,
        items,
      });
      toast.success(`Transfer ${res.data.reference} created as Draft`);
      setCreateModalOpen(false);
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setCreating(false);
    }
  };

  const triggerValidate = (t) => {
    setActionConfirm({
      isOpen: true,
      type: 'validate',
      transferId: t.id,
      loading: false,
    });
  };

  const executeActionConfirm = async () => {
    const { type, transferId } = actionConfirm;
    if (type === 'validate' && !isManager) {
      toast.error('Access Denied: Only Manager (Siya Bhosle) can validate transfers.');
      setActionConfirm({ isOpen: false, type: null, transferId: null, loading: false });
      return;
    }
    setActionConfirm((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'validate') {
        const res = await api.post(`/transfers/${transferId}/validate`);
        toast.success(res.data.message || 'Transfer validated! Stock relocated.');
      } else {
        await api.post(`/transfers/${transferId}/cancel`);
        toast.info('Transfer canceled');
      }
      setActionConfirm({ isOpen: false, type: null, transferId: null, loading: false });
      fetchTransfers();
      if (selectedTransfer && selectedTransfer.id === transferId) {
        setViewModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
      setActionConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const openView = (t) => {
    setSelectedTransfer(t);
    setViewModalOpen(true);
  };

  const sourceWhLocations = locations.filter((l) => l.warehouseId === sourceWarehouseId);
  const destWhLocations = locations.filter((l) => l.warehouseId === destWarehouseId);

  const columns = [
    {
      header: 'Reference',
      key: 'reference',
      render: (t) => (
        <span
          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
          onClick={() => openView(t)}
        >
          {t.reference}
        </span>
      ),
    },
    {
      header: 'Source',
      key: 'source',
      render: (t) => `${t.sourceWarehouse?.code} (${t.sourceLocation?.name})`,
    },
    {
      header: 'Destination',
      key: 'dest',
      render: (t) => `${t.destWarehouse?.code} (${t.destLocation?.name})`,
    },
    {
      header: 'Lines',
      key: 'items',
      render: (t) => `${t.items?.length || 0} product(s)`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Date',
      key: 'createdAt',
      render: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (t) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openView(t)} title="View Details">
            <Eye size={14} /> View
          </button>
          {t.status === 'DRAFT' && (
            isManager ? (
              <button
                className="btn btn-success btn-sm"
                onClick={() => triggerValidate(t)}
                title="Validate & Relocate Stock"
              >
                <Check size={14} /> Validate
              </button>
            ) : (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748B',
                  background: '#F8FAFC',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Only Manager Siya Bhosle can validate and relocate stock"
              >
                <ShieldAlert size={12} color="#F59E0B" /> Manager Req.
              </span>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Internal Transfers">
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> New Transfer
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference..."
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'DONE', label: 'Done' },
                { value: 'CANCELED', label: 'Canceled' },
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={transfers}
          loading={loading}
          emptyTitle="No internal transfers"
          emptyDescription="Move goods between warehouse racks and zones without affecting overall stock totals."
        />

        {/* Create Transfer Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Internal Stock Transfer"
          maxWidth="750px"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateModalOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateTransfer}
                disabled={creating}
              >
                {creating ? 'Saving Draft...' : 'Save as Draft'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateTransfer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '10px', color: '#1E293B' }}>
                  SOURCE LOCATION
                </h4>
                <div className="form-group">
                  <label className="form-label">Warehouse</label>
                  <select
                    className="form-select"
                    value={sourceWarehouseId}
                    onChange={(e) => {
                      const newWh = e.target.value;
                      setSourceWarehouseId(newWh);
                      const locs = locations.filter((l) => l.warehouseId === newWh);
                      setSourceLocationId(locs[0]?.id || '');
                    }}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rack / Zone</label>
                  <select
                    className="form-select"
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(e.target.value)}
                    required
                  >
                    {sourceWhLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '10px', color: '#1E293B' }}>
                  DESTINATION LOCATION
                </h4>
                <div className="form-group">
                  <label className="form-label">Warehouse</label>
                  <select
                    className="form-select"
                    value={destWarehouseId}
                    onChange={(e) => {
                      const newWh = e.target.value;
                      setDestWarehouseId(newWh);
                      const locs = locations.filter((l) => l.warehouseId === newWh);
                      setDestLocationId(locs[0]?.id || '');
                    }}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rack / Zone</label>
                  <select
                    className="form-select"
                    value={destLocationId}
                    onChange={(e) => setDestLocationId(e.target.value)}
                    required
                  >
                    {destWhLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Products to Relocate</h4>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                <Plus size={14} /> Add Line
              </button>
            </div>

            <table className="custom-table" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
              <thead>
                <tr>
                  <th>Product *</th>
                  <th style={{ width: '140px' }}>Transfer Qty *</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select"
                        value={row.productId}
                        onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                        required
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={row.quantity}
                        onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>
        </Modal>

        {/* View Modal */}
        {selectedTransfer && (
          <Modal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            title={`Transfer: ${selectedTransfer.reference}`}
            maxWidth="650px"
            footer={
              <>
                {selectedTransfer.status === 'DRAFT' && (
                  isManager ? (
                    <button
                      className="btn btn-success"
                      onClick={() => triggerValidate(selectedTransfer)}
                    >
                      <Check size={15} /> Validate & Relocate Stock
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#64748B',
                        background: '#F8FAFC',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldAlert size={14} color="#F59E0B" /> Manager Validation Required (Siya Bhosle)
                    </span>
                  )
                )}
                <button className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>
                  Close
                </button>
              </>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reference:</span>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedTransfer.reference}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                <div><StatusBadge status={selectedTransfer.status} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Source:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedTransfer.sourceWarehouse?.name} - {selectedTransfer.sourceLocation?.name}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedTransfer.destWarehouse?.name} - {selectedTransfer.destLocation?.name}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Line Items</h4>
            <table className="custom-table" style={{ border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransfer.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.product?.name}</td>
                    <td><code>{it.product?.sku}</code></td>
                    <td style={{ fontWeight: 700, color: 'var(--info-text)' }}>
                      {it.quantity} {it.product?.uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Modal>
        )}

        {/* Confirmation Modal */}
        <ConfirmDialog
          isOpen={actionConfirm.isOpen}
          onClose={() => setActionConfirm({ isOpen: false, type: null, transferId: null, loading: false })}
          onConfirm={executeActionConfirm}
          title="Validate Internal Transfer"
          message="Validating will move stock between locations atomically. Overall inventory count remains identical. Proceed?"
          confirmLabel="Validate & Move"
          loading={actionConfirm.loading}
        />
      </div>
    </div>
  );
}
