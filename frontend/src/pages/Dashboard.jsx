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
} from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import KPICard from '../components/KPICard';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentOps, setRecentOps] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [warehouses, setWarehouses] = useState([]);

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
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [typeFilter, statusFilter, warehouseFilter]);

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
        {/* KPI Cards */}
        <div className="kpi-grid">
          <KPICard
            label="Total Products"
            value={loadingSummary ? '...' : summary?.totalProducts ?? 0}
            icon={Package}
            color="#4F46E5"
            bgColor="#EEF2FF"
          />
          <KPICard
            label="Low Stock Alerts"
            value={loadingSummary ? '...' : summary?.lowStock ?? 0}
            icon={AlertTriangle}
            color="#D97706"
            bgColor="#FEF3C7"
          />
          <KPICard
            label="Out of Stock"
            value={loadingSummary ? '...' : summary?.outOfStock ?? 0}
            icon={XCircle}
            color="#DC2626"
            bgColor="#FEE2E2"
          />
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
          <KPICard
            label="Pending Receipts"
            value={loadingSummary ? '...' : summary?.pendingReceipts ?? 0}
            icon={ArrowDownToLine}
            color="#2563EB"
            bgColor="#EFF6FF"
          />
          <KPICard
            label="Pending Deliveries"
            value={loadingSummary ? '...' : summary?.pendingDeliveries ?? 0}
            icon={ArrowUpFromLine}
            color="#7C3AED"
            bgColor="#F5F3FF"
          />
          <KPICard
            label="Pending Transfers"
            value={loadingSummary ? '...' : summary?.pendingTransfers ?? 0}
            icon={ArrowLeftRight}
            color="#0891B2"
            bgColor="#ECFEFF"
          />
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
      </div>
    </div>
  );
}
