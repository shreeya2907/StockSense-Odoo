import React, { useState, useEffect } from 'react';
import { Plus, Check, Printer, Trash2, Eye, X } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState([
    { productId: '', locationId: '', quantity: 1 },
  ]);
  const [creating, setCreating] = useState(false);

  // View / Print Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Validate / Cancel confirmation
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    type: null, // 'validate' | 'cancel'
    receiptId: null,
    loading: false,
  });

  const toast = useToast();

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/receipts', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setReceipts(res.data);
    } catch (err) {
      toast.error('Failed to load receipts');
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
      if (whRes.data.length > 0) setWarehouseId(whRes.data[0].id);
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setSupplierName('');
    const defaultWh = warehouses[0]?.id || '';
    setWarehouseId(defaultWh);
    const whLocs = locations.filter((l) => l.warehouseId === defaultWh);
    setItems([
      {
        productId: products[0]?.id || '',
        locationId: whLocs[0]?.id || '',
        quantity: 1,
      },
    ]);
    setCreateModalOpen(true);
  };

  const addItemRow = () => {
    const whLocs = locations.filter((l) => l.warehouseId === warehouseId);
    setItems((prev) => [
      ...prev,
      {
        productId: products[0]?.id || '',
        locationId: whLocs[0]?.id || '',
        quantity: 1,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      toast.warning('Receipt must have at least one product line');
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

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    for (const it of items) {
      if (!it.productId || !it.locationId || Number(it.quantity) <= 0) {
        toast.error('All lines must have a product, location, and valid positive quantity');
        return;
      }
    }

    setCreating(true);
    try {
      const res = await api.post('/receipts', {
        supplierName: supplierName.trim(),
        warehouseId,
        items,
      });
      toast.success(`Receipt ${res.data.reference} created as Draft`);
      setCreateModalOpen(false);
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create receipt');
    } finally {
      setCreating(false);
    }
  };

  const triggerValidate = (r) => {
    setActionConfirm({
      isOpen: true,
      type: 'validate',
      receiptId: r.id,
      loading: false,
    });
  };

  const triggerCancel = (r) => {
    setActionConfirm({
      isOpen: true,
      type: 'cancel',
      receiptId: r.id,
      loading: false,
    });
  };

  const executeActionConfirm = async () => {
    const { type, receiptId } = actionConfirm;
    setActionConfirm((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'validate') {
        const res = await api.post(`/receipts/${receiptId}/validate`);
        toast.success(res.data.message || 'Receipt validated! Stock updated.');
      } else {
        await api.post(`/receipts/${receiptId}/cancel`);
        toast.info('Receipt marked as Canceled');
      }
      setActionConfirm({ isOpen: false, type: null, receiptId: null, loading: false });
      fetchReceipts();
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setViewModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
      setActionConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const openView = (r) => {
    setSelectedReceipt(r);
    setViewModalOpen(true);
  };

  const filteredLocations = locations.filter((l) => l.warehouseId === warehouseId);

  const columns = [
    {
      header: 'Reference',
      key: 'reference',
      render: (r) => (
        <span
          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
          onClick={() => openView(r)}
        >
          {r.reference}
        </span>
      ),
    },
    { header: 'Supplier Name', key: 'supplierName' },
    {
      header: 'Warehouse',
      key: 'warehouse',
      render: (r) => `${r.warehouse?.code} - ${r.warehouse?.name}`,
    },
    {
      header: 'Lines',
      key: 'items',
      render: (r) => `${r.items?.length || 0} product(s)`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Date',
      key: 'createdAt',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openView(r)} title="View Details">
            <Eye size={14} /> View
          </button>
          {r.status === 'DRAFT' && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => triggerValidate(r)}
              title="Validate & Receive Stock"
            >
              <Check size={14} /> Validate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Receipts (Stock In)">
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> New Receipt
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference or supplier..."
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
          data={receipts}
          loading={loading}
          emptyTitle="No receipts found"
          emptyDescription="Create a new receipt to record incoming goods from suppliers."
        />

        {/* Create Receipt Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Inbound Receipt"
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
                onClick={handleCreateReceipt}
                disabled={creating}
              >
                {creating ? 'Saving Draft...' : 'Save as Draft'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateReceipt}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Industrial Supplies"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Destination Warehouse *</label>
                <select
                  className="form-select"
                  value={warehouseId}
                  onChange={(e) => {
                    const newWh = e.target.value;
                    setWarehouseId(newWh);
                    const newLocs = locations.filter((l) => l.warehouseId === newWh);
                    setItems((prev) =>
                      prev.map((it) => ({
                        ...it,
                        locationId: newLocs[0]?.id || '',
                      }))
                    );
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
            </div>

            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Product Lines</h4>
                <span style={{ fontSize: '0.74rem', background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Smart Receiving Active
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                <Plus size={14} /> Add Line
              </button>
            </div>

            <table className="custom-table" style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Product *</th>
                  <th>Location *</th>
                  <th style={{ width: '110px' }}>Expected PO</th>
                  <th style={{ width: '110px' }}>Received Qty *</th>
                  <th style={{ width: '110px' }}>Discrepancy</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const expected = Number(row.expectedQuantity || row.quantity);
                  const received = Number(row.quantity);
                  const diff = received - expected;
                  return (
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
                        <select
                          className="form-select"
                          value={row.locationId}
                          onChange={(e) => updateItemRow(idx, 'locationId', e.target.value)}
                          required
                        >
                          {filteredLocations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={row.expectedQuantity || row.quantity}
                          onChange={(e) => updateItemRow(idx, 'expectedQuantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                          required
                        />
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            padding: '3px 6px',
                            borderRadius: '4px',
                            background: diff === 0 ? '#DCFCE7' : diff > 0 ? '#FEF3C7' : '#FEE2E2',
                            color: diff === 0 ? '#166534' : diff > 0 ? '#92400E' : '#991B1B',
                          }}
                        >
                          {diff === 0 ? 'Match ✓' : diff > 0 ? `+${diff} Extra` : `${diff} Short`}
                        </span>
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
                  );
                })}
              </tbody>
            </table>
          </form>
        </Modal>

        {/* View / Print Receipt Details Modal */}
        {selectedReceipt && (
          <Modal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            title={`Receipt Details: ${selectedReceipt.reference}`}
            maxWidth="700px"
            footer={
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} /> Print Document
                </button>
                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      triggerValidate(selectedReceipt);
                    }}
                  >
                    <Check size={15} /> Validate & Receive Stock
                  </button>
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
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {selectedReceipt.reference}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                <div><StatusBadge status={selectedReceipt.status} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier:</span>
                <div style={{ fontWeight: 600 }}>{selectedReceipt.supplierName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination Warehouse:</span>
                <div>{selectedReceipt.warehouse?.code} - {selectedReceipt.warehouse?.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created By:</span>
                <div>{selectedReceipt.user?.name || 'Staff'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Validated Date:</span>
                <div>
                  {selectedReceipt.validatedAt
                    ? new Date(selectedReceipt.validatedAt).toLocaleString()
                    : 'Not validated yet'}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Line Items</h4>
            <table className="custom-table" style={{ border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Location</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.product?.name}</td>
                    <td><code>{it.product?.sku}</code></td>
                    <td>{it.location?.name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success-text)' }}>
                      +{it.quantity} {it.product?.uom}
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
          onClose={() => setActionConfirm({ isOpen: false, type: null, receiptId: null, loading: false })}
          onConfirm={executeActionConfirm}
          title={actionConfirm.type === 'validate' ? 'Validate Receipt' : 'Cancel Receipt'}
          message={
            actionConfirm.type === 'validate'
              ? 'Validating this receipt will permanently increment the on-hand stock and create an immutable StockMovement entry. Proceed?'
              : 'Are you sure you want to cancel this receipt?'
          }
          confirmLabel={actionConfirm.type === 'validate' ? 'Validate & Add Stock' : 'Yes, Cancel'}
          danger={actionConfirm.type === 'cancel'}
          loading={actionConfirm.loading}
        />
      </div>
    </div>
  );
}
