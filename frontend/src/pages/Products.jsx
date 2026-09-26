import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Search, Package } from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    uom: 'Units',
    reorderLevel: 10,
    unitCost: 0,
    defaultWarehouseId: '',
    defaultLocationId: '',
    initialQuantity: 0,
  });
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        },
      });
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catsRes, whsRes, locsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/warehouses'),
        api.get('/locations'),
      ]);
      setCategories(catsRes.data);
      setWarehouses(whsRes.data);
      setLocations(locsRes.data);
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      categoryId: categories[0]?.id || '',
      uom: 'Units',
      reorderLevel: 10,
      unitCost: 0,
      defaultWarehouseId: warehouses[0]?.id || '',
      defaultLocationId: locations[0]?.id || '',
      initialQuantity: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      uom: p.uom,
      reorderLevel: p.reorderLevel,
      unitCost: p.unitCost,
      defaultWarehouseId: p.defaultWarehouseId || '',
      defaultLocationId: p.defaultLocationId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.categoryId) {
      toast.error('Name, SKU, and Category are required');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        toast.success(`Updated ${formData.name}`);
      } else {
        await api.post('/products', formData);
        toast.success(`Added ${formData.name}`);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = formData.defaultWarehouseId
    ? locations.filter((l) => l.warehouseId === formData.defaultWarehouseId)
    : locations;

  const columns = [
    {
      header: 'Product Name',
      key: 'name',
      render: (p) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{p.uom}</div>
        </div>
      ),
    },
    {
      header: 'SKU',
      key: 'sku',
      render: (p) => (
        <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>
          {p.sku}
        </code>
      ),
    },
    { header: 'Category', key: 'categoryName' },
    {
      header: 'Primary Location',
      key: 'defaultLocationName',
      render: (p) => `${p.defaultWarehouseName} / ${p.defaultLocationName}`,
    },
    {
      header: 'On Hand',
      key: 'onHand',
      render: (p) => (
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.onHand}</span>
      ),
    },
    {
      header: 'Free to Use',
      key: 'freeToUse',
      render: (p) => <span>{p.freeToUse}</span>,
    },
    {
      header: 'Reorder Level',
      key: 'reorderLevel',
      render: (p) => <span style={{ color: 'var(--text-muted)' }}>{p.reorderLevel}</span>,
    },
    {
      header: 'Unit Cost',
      key: 'unitCost',
      render: (p) => `$${Number(p.unitCost).toFixed(2)}`,
    },
    {
      header: 'Stock Status',
      key: 'status',
      render: (p) => <StatusBadge status={p.status} type="stock" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (p) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => openEditModal(p)}
          title="Edit Product"
        >
          <Edit2 size={14} /> Edit
        </button>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Product Catalog & Stock">
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          <Plus size={16} /> Add Product
        </button>
      </Topbar>

      <div className="page-body">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search product name or SKU..."
          filters={[
            {
              value: selectedCategory,
              onChange: setSelectedCategory,
              options: [
                { value: 'ALL', label: 'All Categories' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          rowClassName={(p) => {
            if (p.status === 'OUT_OF_STOCK') return 'row-out-stock';
            if (p.status === 'LOW_STOCK') return 'row-low-stock';
            return '';
          }}
          emptyTitle="No products found"
          emptyDescription="Start building your inventory catalog by adding products."
        />

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
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
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Steel Rods 10mm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU (Unique Code) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. RAW-STL-002"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure (UoM)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Units, Bags, Kg"
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reorder Threshold Level</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                />
              </div>

              {!editingProduct && (
                <div className="form-group">
                  <label className="form-label">Initial Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.initialQuantity}
                    onChange={(e) => setFormData({ ...formData, initialQuantity: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Default Warehouse</label>
                <select
                  className="form-select"
                  value={formData.defaultWarehouseId}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultWarehouseId: e.target.value, defaultLocationId: '' })
                  }
                >
                  <option value="">None</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Default Location</label>
                <select
                  className="form-select"
                  value={formData.defaultLocationId}
                  onChange={(e) => setFormData({ ...formData, defaultLocationId: e.target.value })}
                  disabled={!formData.defaultWarehouseId}
                >
                  <option value="">None</option>
                  {filteredLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
