import React, { useState, useEffect } from 'react';
import { Plus, MapPin } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
      if (res.data.length > 0 && !warehouseId) {
        setWarehouseId(res.data[0].id);
      }
    } catch (err) {
      // non-blocking
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/locations', {
        params: { warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined },
      });
      setLocations(res.data);
    } catch (err) {
      toast.error('Failed to load storage locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [warehouseFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !warehouseId) {
      toast.error('Warehouse and Location Name are required');
      return;
    }

    setSaving(true);
    try {
      await api.post('/locations', {
        warehouseId,
        name: name.trim(),
      });
      toast.success('Storage location added');
      setModalOpen(false);
      setName('');
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create location');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: 'Location / Rack Name',
      key: 'name',
      render: (l) => (
        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} color="var(--primary)" />
          {l.name}
        </span>
      ),
    },
    {
      header: 'Warehouse Facility',
      key: 'warehouse',
      render: (l) => `${l.warehouse?.code} - ${l.warehouse?.name}`,
    },
    {
      header: 'Stocked Items Count',
      key: 'stocks',
      render: (l) => `${l.stocks?.length || 0} product(s) stored`,
    },
  ];

  return (
    <div>
      <Topbar title="Warehouse Storage Locations">
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Location
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          filters={[
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
          data={locations}
          loading={loading}
          emptyTitle="No storage locations found"
          emptyDescription="Configure racks, bins, and staging areas for your warehouses."
        />

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Storage Location / Rack"
          maxWidth="450px"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Location'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Warehouse Facility</label>
              <select
                className="form-select"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
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
              <label className="form-label">Location / Rack Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Rack C, Bulk Staging, Cold Room"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
