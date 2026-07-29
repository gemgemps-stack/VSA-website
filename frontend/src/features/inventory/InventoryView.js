import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import { useNotification } from '../../context/NotificationContext';
import inventoryService from '../../services/inventoryService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';
const SHOP_OPTIONS = ['VSA Online Shop', 'Tiktok Shop', 'Shopee', 'Verdida Sports Apparel'];
const SIZE_OPTIONS = ['Small', 'Medium', 'Large', 'XL', 'XXL'];
const INITIAL_PAGE_SIZE = 100;

const formatDateCreated = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

const getDateSearchValues = (value) => {
  if (!value) {
    return [];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return [String(value).toLowerCase()];
  }

  return [
    date.toLocaleDateString().toLowerCase(),
    date.toISOString().slice(0, 10).toLowerCase(),
  ];
};

const normalizeText = (value) => String(value ?? '').toLowerCase().trim();

const matchesText = (value, term) => {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) {
    return true;
  }

  return normalizeText(value).includes(normalizedTerm);
};

const matchesPrice = (value, term) => {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) {
    return true;
  }

  const rawValue = value != null ? String(value) : '';
  const numericValue = Number(value);
  const formattedValue = Number.isFinite(numericValue) ? numericValue.toFixed(2) : '';

  return normalizeText(rawValue).includes(normalizedTerm) || normalizeText(formattedValue).includes(normalizedTerm);
};

const matchesDate = (value, term) => {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) {
    return true;
  }

  return getDateSearchValues(value).some((dateValue) => dateValue.includes(normalizedTerm));
};

const createInitialFormData = () => ({
  itemType: '',
  jerseyType: '',
  name: '',
  shop: '',
  size: '',
  number: '',
  quantity: '',
  price: '',
  notes: '',
});

const createInitialSearchFilters = () => ({
  itemType: '',
  name: '',
  jerseyType: '',
  size: '',
  quantity: '',
  price: '',
  shop: '',
  createdAt: '',
});

const Inventory = () => {
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotification();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData());
  const [searchFilters, setSearchFilters] = useState(createInitialSearchFilters());

  const loadInventory = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAllInventory(0, INITIAL_PAGE_SIZE);
      setInventory(response.data.content || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      if (isAuthOrPermissionError(error)) {
        return;
      }
      const errorMsg = getApiErrorMessage(error, 'Failed to load inventory');
      notifyError(`Failed to load inventory: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredInventory = inventory.filter((item) =>
    matchesText(item.itemType, searchFilters.itemType) &&
    matchesText(item.name, searchFilters.name) &&
    matchesText(item.jerseyType, searchFilters.jerseyType) &&
    matchesText(item.size, searchFilters.size) &&
    matchesText(item.quantity, searchFilters.quantity) &&
    matchesPrice(item.price, searchFilters.price) &&
    matchesText(item.shop, searchFilters.shop) &&
    matchesDate(item.createdAt, searchFilters.createdAt)
  );

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / 10));
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * 10, currentPage * 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilters]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemType: item.itemType || '',
      jerseyType: item.jerseyType || '',
      name: item.name || '',
      shop: item.shop || '',
      size: item.size || '',
      number: item.number || '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      price: item.price != null ? String(item.price) : '',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleViewDetails = (item) => {
    setDetailsItem(item);
  };

  const closeDetails = () => {
    setDetailsItem(null);
  };

  const handleDelete = async (id) => {
    try {
      await inventoryService.deleteInventory(id);
      notifySuccess('Item deleted successfully');
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      notifyError('Failed to delete item');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.itemType || !formData.name || !formData.quantity || !formData.price) {
        notifyInfo('Please fill in all required fields');
        return;
      }

      const parsedQty = Number.parseInt(formData.quantity, 10);
      if (!Number.isFinite(parsedQty) || parsedQty < 0) {
        notifyInfo('Quantity cannot be less than zero');
        return;
      }

      const payload = {
        itemType: formData.itemType,
        jerseyType: formData.jerseyType.trim() || null,
        name: formData.name,
        shop: formData.shop.trim() || null,
        size: formData.size || null,
        number: formData.number.trim() || null,
        quantity: parseInt(formData.quantity, 10),
        price: parseFloat(formData.price),
        notes: formData.notes.trim() || null,
      };

      if (editingItem) {
        await inventoryService.updateInventory(editingItem.id, payload);
        notifySuccess('Item updated successfully');
      } else {
        await inventoryService.createInventory(payload);
        notifySuccess('Item created successfully');
      }

      setModalOpen(false);
      setEditingItem(null);
      setFormData(createInitialFormData());
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save item';
      notifyError(`Failed to save item: ${errorMessage}`);
    }
  };

  const columns = [
    { key: 'itemType', label: 'Item Type' },
    { key: 'name', label: 'Name' },
    {
      key: 'jerseyType',
      label: 'Version',
      render: (value) => value || '-',
    },
    { key: 'size', label: 'Size', render: (value) => value || '-' },
    { key: 'quantity', label: 'Quantity', render: (value) => value || '0' },
    {
      key: 'price',
      label: 'Price',
      render: (value) => (value != null ? Number(value).toFixed(2) : '-'),
    },
    { key: 'shop', label: 'Shop', render: (value) => value || '-' },
    {
      key: 'createdAt',
      label: 'Date Created',
      render: (value) => formatDateCreated(value),
    },
  ];

  const openNewItemModal = () => {
    setEditingItem(null);
    setFormData(createInitialFormData());
    setModalOpen(true);
  };

  const inventoryStats = [
    { label: 'Tracked items', value: inventory.length, detail: 'Loaded in current roster' },
    { label: 'Visible now', value: paginatedInventory.length, detail: 'On this page' },
    { label: 'Filtered results', value: filteredInventory.length, detail: 'Matching your search' },
  ];

  return (
    <PermissionGuard permission="INVENTORY">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <div className="page-title-block">
              <span style={sectionIconBadgeStyle} aria-hidden="true">
                <SectionIcon variant="inventory" />
              </span>
              <span className="page-eyebrow">Stock control</span>
              <h1>Inventory</h1>
              <p className="page-subtitle">
                Review your stock, refine searches quickly, and keep the catalog easy to maintain.
              </p>
            </div>
            <div className="page-actions">
              <button className="btn-primary" onClick={openNewItemModal} type="button">
                Add Item
              </button>
            </div>
          </div>

          <div className="content-surface">
            <div className="content-surface-header">
              <div>
                <h2>Inventory overview</h2>
                <p>Browse the full catalog and jump to the exact item you need.</p>
              </div>
              <div className="stats-strip">
                {inventoryStats.map((stat) => (
                  <div key={stat.label} className="stat-pill">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                    <small>{stat.detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="search-and-filter-row">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                <span style={{ ...sectionIconBadgeStyle, width: '36px', height: '36px', marginBottom: 0 }} aria-hidden="true">
                  <SectionIcon variant="search" />
                </span>
                <div className="inventory-search-bar" aria-label="Inventory search filters">
                  <input
                    type="text"
                    value={searchFilters.itemType}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, itemType: e.target.value }))}
                    placeholder="Search item type"
                  />
                  <input
                    type="text"
                    value={searchFilters.name}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Search name"
                  />
                  <input
                    type="text"
                    value={searchFilters.jerseyType}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, jerseyType: e.target.value }))}
                    placeholder="Search version"
                  />
                  <input
                    type="text"
                    value={searchFilters.size}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, size: e.target.value }))}
                    placeholder="Search size"
                  />
                  <input
                    type="text"
                    value={searchFilters.shop}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, shop: e.target.value }))}
                    placeholder="Search shop"
                  />
                  <input
                    type="text"
                    value={searchFilters.createdAt}
                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, createdAt: e.target.value }))}
                    placeholder="Search date created"
                  />
                </div>
              </div>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="empty-state">
                <span style={{ ...sectionIconBadgeStyle, marginBottom: '12px' }} aria-hidden="true">
                  <SectionIcon variant="inventory" />
                </span>
                <h3>No inventory items match your current filters</h3>
                <p>Try a broader term or add a new item to refresh the catalog.</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={paginatedInventory}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

          <Modal
            isOpen={modalOpen}
            title={editingItem ? 'Edit Item' : 'New Item'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingItem ? 'Update' : 'Add'}
            size="medium"
          >
            <form className="inventory-modal-form">
              <div className="inventory-modal-grid inventory-modal-grid-row-2">
                <div className="form-group">
                  <label>Item Type</label>
                  <input
                    type="text"
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    placeholder="Enter item type"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                    required
                  />
                </div>
              </div>

              <div className="inventory-modal-grid inventory-modal-grid-row-3">
                <div className="form-group">
                  <label>Version (Optional)</label>
                  <input
                    type="text"
                    value={formData.jerseyType}
                    onChange={(e) => setFormData({ ...formData, jerseyType: e.target.value })}
                    placeholder="Enter version"
                  />
                </div>

                <div className="form-group">
                  <label>Size (Optional)</label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    <option value="">Select size</option>
                    {SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Size Number (Optional )</label>
                  <input
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Enter size number"
                  />
                </div>
              </div>

              <div className="inventory-modal-grid inventory-modal-grid-row-3">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setFormData({ ...formData, quantity: '' });
                        return;
                      }
                      const n = Number.parseInt(v, 10);
                      if (!Number.isFinite(n)) return;
                      setFormData({ ...formData, quantity: String(Math.max(0, n)) });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Shop</label>
                  <select
                    value={formData.shop}
                    onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
                  >
                    <option value="">Select shop</option>
                    {SHOP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group inventory-notes-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes"
                  rows={4}
                />
              </div>
            </form>
          </Modal>

          <Modal
            isOpen={Boolean(detailsItem)}
            title="Item Details"
            onClose={closeDetails}
            size="large"
          >
            {detailsItem && (
              <div className="inventory-details">
                <div className="inventory-details-hero">
                  <div>
                    <p className="inventory-details-eyebrow">Inventory Item</p>
                    <h3>{detailsItem.name || '-'}</h3>
                  </div>
                  <div className="inventory-details-hero-badge">
                    {detailsItem.itemType || 'Item Type'}
                  </div>
                </div>

                <div className="inventory-details-grid">
                  <div className="inventory-details-item">
                    <span>Version</span>
                    <strong>{detailsItem.jerseyType || '-'}</strong>
                  </div>
                  <div className="inventory-details-item">
                    <span>Shop</span>
                    <strong>{detailsItem.shop || '-'}</strong>
                  </div>
                  <div className="inventory-details-item">
                    <span>Size</span>
                    <strong>{detailsItem.size || '-'}</strong>
                  </div>
                  <div className="inventory-details-item">
                    <span>Size Number</span>
                    <strong>{detailsItem.number || '-'}</strong>
                  </div>
                  <div className="inventory-details-item">
                    <span>Quantity</span>
                    <strong>{detailsItem.quantity != null ? detailsItem.quantity : '-'}</strong>
                  </div>
                  <div className="inventory-details-item">
                    <span>Price</span>
                    <strong>
                      {detailsItem.price != null ? Number(detailsItem.price).toFixed(2) : '-'}
                    </strong>
                  </div>
                  <div className="inventory-details-item inventory-details-item-full">
                    <span>Notes</span>
                    <strong>{detailsItem.notes || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
          </Modal>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Inventory;


