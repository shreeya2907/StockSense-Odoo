import React, { useState, useEffect } from 'react';
import { Plus, Check, Printer, Trash2, Eye, AlertTriangle } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState([
    { productId: '', locationId: '', quantity: 1 },
  ]);
  const [creating, setCreating] = useState(false);

  // View / Print Modal
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Insufficient stock warning banner
  const [stockError, setStockError] = useState(null);

  // Validate / Cancel confirmation
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    type: null, // 'validate' | 'cancel'
    deliveryId: null,
    loading: false,
  });

  const toast = useToast();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/deliveries', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setDeliveries(res.data);
    } catch (err) {
      toast.error('Failed to load deliveries');
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
    fetchDeliveries();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setCustomerName('');
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
      toast.warning('Delivery must have at least one product line');
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

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
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
      const res = await api.post('/deliveries', {
        customerName: customerName.trim(),
        warehouseId,
        items,
      });
      toast.success(`Delivery ${res.data.reference} created as Draft`);
      setCreateModalOpen(false);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create delivery');
    } finally {
      setCreating(false);
    }
  };

  const triggerValidate = (d) => {
    setStockError(null);
    setActionConfirm({
      isOpen: true,
      type: 'validate',
      deliveryId: d.id,
      loading: false,
    });
  };

  const executeActionConfirm = async () => {
    const { type, deliveryId } = actionConfirm;
    setActionConfirm((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'validate') {
        const res = await api.post(`/deliveries/${deliveryId}/validate`);
        toast.success(res.data.message || 'Delivery validated! Stock deducted.');
      } else {
        await api.post(`/deliveries/${deliveryId}/cancel`);
        toast.info('Delivery marked as Canceled');
      }
      setActionConfirm({ isOpen: false, type: null, deliveryId: null, loading: false });
      fetchDeliveries();
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setViewModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed';
      toast.error(msg);
      if (err.response?.data?.insufficientLines) {
        setStockError(err.response.data.insufficientLines);
      }
      setActionConfirm((prev) => ({ ...prev, loading: false, isOpen: false }));
    }
  };

  const openView = (d) => {
    setSelectedDelivery(d);
    setStockError(null);
    setViewModalOpen(true);
  };

  const filteredLocations = locations.filter((l) => l.warehouseId === warehouseId);

  const columns = [
    {
      header: 'Reference',
      key: 'reference',
      render: (d) => (
        <span
          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
          onClick={() => openView(d)}
        >
          {d.reference}
        </span>
      ),
    },
    { header: 'Customer Name', key: 'customerName' },
    {
      header: 'Warehouse',
      key: 'warehouse',
      render: (d) => `${d.warehouse?.code} - ${d.warehouse?.name}`,
    },
    {
      header: 'Lines',
      key: 'items',
      render: (d) => `${d.items?.length || 0} product(s)`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'Date',
      key: 'createdAt',
      render: (d) => new Date(d.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (d) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openView(d)} title="View Details">
            <Eye size={14} /> View
          </button>
          {d.status === 'DRAFT' && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => triggerValidate(d)}
              title="Validate & Ship Stock"
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
      <Topbar title="Deliveries (Stock Out)">
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> New Delivery
        </button>
      </Topbar>

      <div className="page-body">
        {stockError && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                Insufficient Stock — Delivery Blocked
              </h4>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Cannot validate this delivery order because on-hand stock is lower than requested:
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '0.84rem' }}>
                {stockError.map((line, idx) => (
                  <li key={idx}>
                    <strong>{line.productName}</strong> at {line.locationName}: requested{' '}
                    <strong>{line.requested}</strong>, but only <strong>{line.available}</strong> is available in stock.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference or customer..."
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
          data={deliveries}
          loading={loading}
          emptyTitle="No deliveries found"
          emptyDescription="Create an outbound delivery to fulfill customer orders."
        />

        {/* Create Delivery Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Outbound Delivery"
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
                onClick={handleCreateDelivery}
                disabled={creating}
              >
                {creating ? 'Saving Draft...' : 'Save as Draft'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateDelivery}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Corporation"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Warehouse *</label>
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
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Delivery Product Lines</h4>
                <span style={{ fontSize: '0.74rem', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Smart Safety Audit Active
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
                  <th>Pick Location *</th>
                  <th style={{ width: '120px' }}>Quantity *</th>
                  <th style={{ width: '130px' }}>Safety Audit</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const prod = products.find((p) => p.id === row.productId);
                  const onHand = prod?.stocks?.find((s) => s.locationId === row.locationId)?.quantity || 0;
                  const isSafe = onHand >= Number(row.quantity);
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
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isSafe ? '#DCFCE7' : '#FEE2E2',
                            color: isSafe ? '#166534' : '#991B1B',
                          }}
                        >
                          {isSafe ? `Available (${onHand}) ✓` : `Short (${onHand} avail) ⚠️`}
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

        {/* View / Print Delivery Details Modal */}
        {selectedDelivery && (
          <Modal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            title={`Delivery Order: ${selectedDelivery.reference}`}
            maxWidth="700px"
            footer={
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} /> Print Dispatch Note
                </button>
                {selectedDelivery.status === 'DRAFT' && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      triggerValidate(selectedDelivery);
                    }}
                  >
                    <Check size={15} /> Validate & Deduct Stock
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
                  {selectedDelivery.reference}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                <div><StatusBadge status={selectedDelivery.status} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer:</span>
                <div style={{ fontWeight: 600 }}>{selectedDelivery.customerName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatch Warehouse:</span>
                <div>{selectedDelivery.warehouse?.code} - {selectedDelivery.warehouse?.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created By:</span>
                <div>{selectedDelivery.user?.name || 'Staff'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Validated Date:</span>
                <div>
                  {selectedDelivery.validatedAt
                    ? new Date(selectedDelivery.validatedAt).toLocaleString()
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
                  <th>Pick Location</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedDelivery.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.product?.name}</td>
                    <td><code>{it.product?.sku}</code></td>
                    <td>{it.location?.name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-text)' }}>
                      -{it.quantity} {it.product?.uom}
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
          onClose={() => setActionConfirm({ isOpen: false, type: null, deliveryId: null, loading: false })}
          onConfirm={executeActionConfirm}
          title={actionConfirm.type === 'validate' ? 'Validate Delivery' : 'Cancel Delivery'}
          message={
            actionConfirm.type === 'validate'
              ? 'Validating this delivery checks stock availability, deducts on-hand inventory, and creates an immutable StockMovement OUT record. Proceed?'
              : 'Are you sure you want to cancel this delivery order?'
          }
          confirmLabel={actionConfirm.type === 'validate' ? 'Validate & Ship' : 'Yes, Cancel'}
          danger={actionConfirm.type === 'cancel'}
          loading={actionConfirm.loading}
        />
      </div>
    </div>
  );
}
