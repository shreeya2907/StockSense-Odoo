import React, { useState, useEffect } from 'react';
import { History, Download } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export default function MoveHistory() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [warehouses, setWarehouses] = useState([]);

  const toast = useToast();

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (err) {
      // non-blocking
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== 'ALL') params.movementType = typeFilter;
      if (warehouseFilter !== 'ALL') params.warehouseId = warehouseFilter;

      const res = await api.get('/movements', { params });
      setMovements(res.data);
    } catch (err) {
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [search, typeFilter, warehouseFilter]);

  const columns = [
    {
      header: 'Date & Time',
      key: 'date',
      render: (m) => new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      header: 'Reference',
      key: 'reference',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{m.reference}</span>
      ),
    },
    {
      header: 'Product',
      key: 'product',
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600 }}>{m.product?.name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{m.product?.sku}</div>
        </div>
      ),
    },
    {
      header: 'Movement Type',
      key: 'movementType',
      render: (m) => <StatusBadge status={m.movementType} type="movement" />,
    },
    {
      header: 'Quantity',
      key: 'quantity',
      render: (m) => {
        const isPos = m.quantity > 0;
        return (
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.94rem',
              color:
                m.movementType === 'IN'
                  ? 'var(--success-text)'
                  : m.movementType === 'OUT'
                  ? 'var(--danger-text)'
                  : m.movementType === 'TRANSFER'
                  ? 'var(--info-text)'
                  : isPos
                  ? 'var(--success-text)'
                  : 'var(--danger-text)',
            }}
          >
            {isPos ? `+${m.quantity}` : m.quantity} {m.product?.uom}
          </span>
        );
      },
    },
    {
      header: 'Warehouse',
      key: 'warehouse',
      render: (m) => m.warehouse?.code || 'N/A',
    },
    {
      header: 'From Location',
      key: 'fromLocation',
      render: (m) => m.fromLocation?.name || '—',
    },
    {
      header: 'To Location',
      key: 'toLocation',
      render: (m) => m.toLocation?.name || '—',
    },
    {
      header: 'Staff User',
      key: 'user',
      render: (m) => m.user?.name || 'System',
    },
  ];

  return (
    <div>
      <Topbar title="Stock Ledger & Move History">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.print()}
        >
          <Download size={15} /> Export View
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference, product, or SKU..."
          filters={[
            {
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: 'ALL', label: 'All Movement Types' },
                { value: 'IN', label: 'IN (Receipt)' },
                { value: 'OUT', label: 'OUT (Delivery)' },
                { value: 'TRANSFER', label: 'TRANSFER (Internal)' },
                { value: 'ADJUSTMENT', label: 'ADJUSTMENT (Variance)' },
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
          data={movements}
          loading={loading}
          emptyTitle="No stock movements logged"
          emptyDescription="Every verified stock receipt, delivery, transfer, and adjustment writes an immutable record here."
        />
      </div>
    </div>
  );
}
