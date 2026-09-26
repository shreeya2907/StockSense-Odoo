import React, { useState, useEffect } from 'react';
import { Plus, Warehouse, MapPin } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and Name are required');
      return;
    }

    setSaving(true);
    try {
      await api.post('/warehouses', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      });
      toast.success('Warehouse created successfully');
      setModalOpen(false);
      setCode('');
      setName('');
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: 'Code',
      key: 'code',
      render: (w) => (
        <code style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
          {w.code}
        </code>
      ),
    },
    { header: 'Warehouse Name', key: 'name', render: (w) => <span style={{ fontWeight: 600 }}>{w.name}</span> },
    {
      header: 'Locations Configured',
      key: 'locations',
      render: (w) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={14} color="var(--primary)" />
          {w.locations?.length || 0} rack(s)/zone(s)
        </span>
      ),
    },
    {
      header: 'Total Stock Records',
      key: 'stocks',
      render: (w) => `${w._count?.stocks || 0} SKU-location pairs`,
    },
  ];

  return (
    <div>
      <Topbar title="Warehouse Facilities">
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Warehouse
        </button>
      </Topbar>

      <div className="page-body">
        <DataTable
          columns={columns}
          data={warehouses}
          loading={loading}
          emptyTitle="No warehouses configured"
          emptyDescription="Add warehouses to start managing inventory across multiple facilities."
        />

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add New Warehouse"
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
                {saving ? 'Creating...' : 'Save Warehouse'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Warehouse Code (e.g. WH1, WH2)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. WH3"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. North Distribution Center"
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
