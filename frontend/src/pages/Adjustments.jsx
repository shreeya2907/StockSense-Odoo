import React, { useState, useEffect } from 'react';
import { Plus, Check, Eye } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metadata
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [reason, setReason] = useState('COUNTING_ERROR');
  const [creating, setCreating] = useState(false);

  // Validate confirmation
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    adjustmentId: null,
    loading: false,
  });

  const toast = useToast();

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/adjustments', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setAdjustments(res.data);
    } catch (err) {
      toast.error('Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [prodRes, whRes, locRes] = await Promise.all([
        api.get('/products'),
        api.get('/warehouses'),
        api.get('/locations'),
      ]);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);
      setLocations(locRes.data);

      if (prodRes.data.length > 0) setProductId(prodRes.data[0].id);
      if (whRes.data.length > 0) {
        setWarehouseId(whRes.data[0].id);
        const whLocs = locRes.data.filter((l) => l.warehouseId === whRes.data[0].id);
        if (whLocs.length > 0) setLocationId(whLocs[0].id);
      }
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAdjustments();
  }, [search, statusFilter]);

  // When product or location changes, look up system quantity live!
  useEffect(() => {
    async function lookupStock() {
      if (productId && locationId) {
        try {
          const res = await api.get('/stock/onhand', {
            params: { productId, locationId },
          });
          const qty = res.data.quantity;
          setSystemQuantity(qty);
          setCountedQuantity(qty);
        } catch (err) {
          setSystemQuantity(0);
        }
      }
    }
    lookupStock();
  }, [productId, locationId]);

  const openCreateModal = () => {
    const defaultWh = warehouses[0]?.id || '';
    setWarehouseId(defaultWh);
    const whLocs = locations.filter((l) => l.warehouseId === defaultWh);
    const defLoc = whLocs[0]?.id || '';
    setLocationId(defLoc);
    const defProd = products[0]?.id || '';
    setProductId(defProd);
    setReason('COUNTING_ERROR');
    setCreateModalOpen(true);
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (countedQuantity < 0) {
      toast.error('Counted quantity cannot be negative');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/adjustments', {
        productId,
        warehouseId,
        locationId,
        countedQuantity: Number(countedQuantity),
        reason,
      });
      toast.success(`Adjustment ${res.data.reference} created as Draft`);
      setCreateModalOpen(false);
      fetchAdjustments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create adjustment');
    } finally {
      setCreating(false);
    }
  };

  const triggerValidate = (adj) => {
    setActionConfirm({
      isOpen: true,
      adjustmentId: adj.id,
      loading: false,
    });
  };

  const executeActionConfirm = async () => {
    setActionConfirm((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/adjustments/${actionConfirm.adjustmentId}/validate`);
      toast.success(res.data.message || 'Stock reconciled successfully!');
      setActionConfirm({ isOpen: false, adjustmentId: null, loading: false });
      fetchAdjustments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to validate adjustment');
      setActionConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const difference = Number(countedQuantity) - Number(systemQuantity);
  const filteredLocations = locations.filter((l) => l.warehouseId === warehouseId);

  const columns = [
    {
      header: 'Reference',
      key: 'reference',
      render: (a) => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{a.reference}</span>,
    },
    {
      header: 'Product',
      key: 'product',
      render: (a) => (
        <div>
          <div style={{ fontWeight: 600 }}>{a.product?.name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{a.product?.sku}</div>
        </div>
      ),
    },
    {
      header: 'Warehouse & Location',
      key: 'location',
      render: (a) => `${a.warehouse?.code} / ${a.location?.name}`,
    },
    { header: 'System Qty', key: 'systemQuantity' },
    {
      header: 'Counted Qty',
      key: 'countedQuantity',
      render: (a) => <span style={{ fontWeight: 700 }}>{a.countedQuantity}</span>,
    },
    {
      header: 'Difference',
      key: 'difference',
      render: (a) => (
        <span
          style={{
            fontWeight: 700,
            color: a.difference > 0 ? 'var(--success-text)' : a.difference < 0 ? 'var(--danger-text)' : 'var(--text-muted)',
          }}
        >
          {a.difference > 0 ? `+${a.difference}` : a.difference}
        </span>
      ),
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (a) => <code style={{ fontSize: '0.78rem' }}>{a.reason}</code>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (a) =>
        a.status === 'DRAFT' && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => triggerValidate(a)}
            title="Reconcile Physical Count"
          >
            <Check size={14} /> Validate
          </button>
        ),
    },
  ];

  return (
    <div>
      <Topbar title="Stock Adjustments">
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> New Adjustment
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference or product..."
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'DONE', label: 'Done' },
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={adjustments}
          loading={loading}
          emptyTitle="No stock adjustments"
          emptyDescription="Perform a physical stock count reconciliation to resolve variances."
        />

        {/* Create Adjustment Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Physical Stock Count Reconciliation"
          maxWidth="600px"
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
                onClick={handleCreateAdjustment}
                disabled={creating}
              >
                {creating ? 'Saving Draft...' : 'Save Draft Adjustment'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateAdjustment}>
            <div className="form-group">
              <label className="form-label">Product to Reconcile *</label>
              <select
                className="form-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Warehouse *</label>
                <select
                  className="form-select"
                  value={warehouseId}
                  onChange={(e) => {
                    const newWh = e.target.value;
                    setWarehouseId(newWh);
                    const locs = locations.filter((l) => l.warehouseId === newWh);
                    setLocationId(locs[0]?.id || '');
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

              <div className="form-group">
                <label className="form-label">Location / Rack *</label>
                <select
                  className="form-select"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                >
                  {filteredLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                margin: '16px 0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT SYSTEM QTY</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{systemQuantity}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PHYSICAL COUNTED</span>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}
                  value={countedQuantity}
                  onChange={(e) => setCountedQuantity(e.target.value)}
                  required
                />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VARIANCE / DIFF</span>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: difference > 0 ? 'var(--success-text)' : difference < 0 ? 'var(--danger-text)' : 'var(--text-muted)',
                  }}
                >
                  {difference > 0 ? `+${difference}` : difference}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Variance Reason</label>
              <select
                className="form-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="COUNTING_ERROR">Counting Error</option>
                <option value="DAMAGED">Damaged Goods</option>
                <option value="LOST">Lost / Stolen</option>
                <option value="FOUND">Found Surplus</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
          </form>
        </Modal>

        {/* Confirmation Modal */}
        <ConfirmDialog
          isOpen={actionConfirm.isOpen}
          onClose={() => setActionConfirm({ isOpen: false, adjustmentId: null, loading: false })}
          onConfirm={executeActionConfirm}
          title="Reconcile Inventory Count"
          message="Validating will set current stock quantity to the counted quantity and write a signed ledger movement. Proceed?"
          confirmLabel="Validate & Reconcile"
          loading={actionConfirm.loading}
        />
      </div>
    </div>
  );
}
