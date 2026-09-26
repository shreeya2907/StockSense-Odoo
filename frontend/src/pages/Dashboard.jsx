import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  DollarSign,
  Plus,
  Sparkles,
  HelpCircle,
  Zap,
} from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import KPICard from '../components/KPICard';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ExplainNumberModal from '../components/ExplainNumberModal';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentOps, setRecentOps] = useState([]);
  const [smartActions, setSmartActions] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [warehouses, setWarehouses] = useState([]);

  // Feature 12: Explain This Number modal
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [explainMetric, setExplainMetric] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/dashboard/summary');
      setSummary(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard KPIs');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (err) {
      // non-blocking
    }
  };

  const fetchSmartActions = async () => {
    try {
      const res = await api.get('/intelligence/smart-actions');
      setSmartActions(res.data);
    } catch (err) {
      // non-blocking
    }
  };

  const fetchRecent = async () => {
    try {
      setLoadingRecent(true);
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (warehouseFilter !== 'ALL') params.warehouseId = warehouseFilter;

      const res = await api.get('/dashboard/recent', { params });
      setRecentOps(res.data);
    } catch (err) {
      toast.error('Failed to load recent operations');
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchWarehouses();
    fetchSmartActions();
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [typeFilter, statusFilter, warehouseFilter]);

  const handleExplain = (metricKey) => {
    setExplainMetric(metricKey);
    setExplainModalOpen(true);
  };

  const columns = [
    {
      header: 'Reference',
      key: 'reference',
      render: (r) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {r.reference}
        </span>
      ),
    },
    {
      header: 'Document Type',
      key: 'type',
      render: (r) => (
        <span style={{ fontWeight: 500 }}>
          {r.type === 'RECEIPT' && 'Receipt (IN)'}
          {r.type === 'DELIVERY' && 'Delivery (OUT)'}
          {r.type === 'TRANSFER' && 'Internal Transfer'}
        </span>
      ),
    },
    { header: 'Partner / Route', key: 'partner' },
    { header: 'Warehouse', key: 'warehouse' },
    {
      header: 'Items',
      key: 'itemCount',
      render: (r) => `${r.itemCount} line(s)`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Created Date',
      key: 'createdAt',
      render: (r) => new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    },
  ];

  return (
    <div>
      <Topbar title="Inventory Dashboard">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/receipts')}
        >
          <Plus size={16} /> New Receipt
        </button>
      </Topbar>

      <div className="page-body">
        {/* Smart Action Center Banner (Feature 8) */}
        {smartActions.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              color: '#FFFFFF',
              borderRadius: '14px',
              padding: '18px 24px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                }}
              >
                <Zap size={22} color="#FBBF24" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                  Smart Action Center: {smartActions[0]?.title}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#C7D2FE', marginTop: '2px' }}>
                  {smartActions[0]?.description}
                </div>
              </div>
            </div>

            <button
              className="btn btn-sm"
              style={{ background: '#FFFFFF', color: '#1E1B4B', fontWeight: 700 }}
              onClick={() => navigate(smartActions[0]?.actionTarget || '/intelligence?tab=actions')}
            >
              Take Action ➔
            </button>
          </div>
        )}

        {/* KPI Cards (With Feature 12: Explain This Number on click) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            💡 Tip: Click on any card below to see its exact mathematical breakdown & data items.
          </span>
        </div>

        <div className="kpi-grid">
          <div onClick={() => handleExplain('totalProducts')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Total Products"
              value={loadingSummary ? '...' : summary?.totalProducts ?? 0}
              icon={Package}
              color="#4F46E5"
              bgColor="#EEF2FF"
            />
          </div>

          <div onClick={() => handleExplain('lowStock')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Low Stock Alerts"
              value={loadingSummary ? '...' : summary?.lowStock ?? 0}
              icon={AlertTriangle}
              color="#D97706"
              bgColor="#FEF3C7"
            />
          </div>

          <div onClick={() => handleExplain('outOfStock')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Out of Stock"
              value={loadingSummary ? '...' : summary?.outOfStock ?? 0}
              icon={XCircle}
              color="#DC2626"
              bgColor="#FEE2E2"
            />
          </div>

          <div onClick={() => handleExplain('totalStockValue')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Total Inventory Value"
              value={
                loadingSummary
                  ? '...'
                  : `$${(summary?.totalStockValue || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
              }
              icon={DollarSign}
              color="#059669"
              bgColor="#ECFDF5"
            />
          </div>

          <div onClick={() => navigate('/receipts')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Pending Receipts"
              value={loadingSummary ? '...' : summary?.pendingReceipts ?? 0}
              icon={ArrowDownToLine}
              color="#2563EB"
              bgColor="#EFF6FF"
            />
          </div>

          <div onClick={() => navigate('/deliveries')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Pending Deliveries"
              value={loadingSummary ? '...' : summary?.pendingDeliveries ?? 0}
              icon={ArrowUpFromLine}
              color="#7C3AED"
              bgColor="#F5F3FF"
            />
          </div>

          <div onClick={() => navigate('/transfers')} style={{ cursor: 'pointer' }}>
            <KPICard
              label="Pending Transfers"
              value={loadingSummary ? '...' : summary?.pendingTransfers ?? 0}
              icon={ArrowLeftRight}
              color="#0891B2"
              bgColor="#ECFEFF"
            />
          </div>
        </div>

        {/* Section Heading & Filter */}
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Recent Operations Activity
          </h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing latest active documents
          </span>
        </div>

        <FilterBar
          filters={[
            {
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: 'ALL', label: 'All Document Types' },
                { value: 'RECEIPT', label: 'Receipts (IN)' },
                { value: 'DELIVERY', label: 'Deliveries (OUT)' },
                { value: 'TRANSFER', label: 'Transfers' },
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'WAITING', label: 'Waiting' },
                { value: 'READY', label: 'Ready' },
                { value: 'DONE', label: 'Done' },
                { value: 'CANCELED', label: 'Canceled' },
              ],
            },
            {
              value: warehouseFilter,
              onChange: setWarehouseFilter,
              options: [
                { value: 'ALL', label: 'All Warehouses' },
                ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` })),
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={recentOps}
          loading={loadingRecent}
          emptyTitle="No recent operations"
          emptyDescription="Create your first receipt or transfer to see it reflected here."
          onRowClick={(row) => {
            if (row.type === 'RECEIPT') navigate('/receipts');
            if (row.type === 'DELIVERY') navigate('/deliveries');
            if (row.type === 'TRANSFER') navigate('/transfers');
          }}
        />

        {/* Feature 12: Explain This Number Modal */}
        <ExplainNumberModal
          isOpen={explainModalOpen}
          onClose={() => setExplainModalOpen(false)}
          metricKey={explainMetric}
        />
      </div>
    </div>
  );
}
