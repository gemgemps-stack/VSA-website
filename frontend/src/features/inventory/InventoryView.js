import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import inventoryService from '../../services/inventoryService';

const ITEM_TYPE_OPTIONS = ['Jersey', 'Polo Shirt', 'Chinese Collar', 'Ready Made'];
const SHOP_OPTIONS = ['VSA Online Shop', 'Tiktok Shop', 'Shopppee', 'Verdida Sports Apparel'];
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
});

const createInitialSearchFilters = () => ({
  itemType: '',
  name: '',
  jerseyType: '',
  size: '',
  number: '',
  price: '',
  shop: '',
  createdAt: '',
});

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData());
  const [searchFilters, setSearchFilters] = useState(createInitialSearchFilters());

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAllInventory(0, INITIAL_PAGE_SIZE);
      setInventory(response.data.content || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    matchesText(item.itemType, searchFilters.itemType) &&
    matchesText(item.name, searchFilters.name) &&
    matchesText(item.jerseyType, searchFilters.jerseyType) &&
    matchesText(item.size, searchFilters.size) &&
    matchesText(item.number, searchFilters.number) &&
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
      itemType: item.itemType || 'Jersey',
      jerseyType: item.jerseyType || '',
      name: item.name || '',
      shop: item.shop || '',
      size: item.size || '',
      number: item.number || '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      price: item.price != null ? String(item.price) : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await inventoryService.deleteInventory(id);
      alert('Item deleted successfully');
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.itemType || !formData.name || !formData.quantity || !formData.price) {
        alert('Please fill in all required fields');
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
      };

      if (editingItem) {
        await inventoryService.updateInventory(editingItem.id, payload);
        alert('Item updated successfully');
      } else {
        await inventoryService.createInventory(payload);
        alert('Item created successfully');
      }

      setModalOpen(false);
      setEditingItem(null);
      setFormData(createInitialFormData());
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save item';
      alert(`Failed to save item: ${errorMessage}`);
    }
  };

  const columns = [
    { key: 'itemType', label: 'Item Type' },
    { key: 'name', label: 'Name' },
    {
      key: 'jerseyType',
      label: 'Jersey Type',
      render: (value) => value || '-',
    },
    { key: 'size', label: 'Size', render: (value) => value || '-' },
    { key: 'number', label: 'Number', render: (value) => value || '-' },
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

  return (
    <PermissionGuard permission="INVENTORY">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Inventory</h1>
            <button className="btn-primary" onClick={openNewItemModal} type="button">
              + Add Item
            </button>
          </div>

          <div
            className="inventory-search-bar"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
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
              placeholder="Search jersey type"
            />
            <input
              type="text"
              value={searchFilters.size}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, size: e.target.value }))}
              placeholder="Search size"
            />
            <input
              type="text"
              value={searchFilters.number}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, number: e.target.value }))}
              placeholder="Search number"
            />
            <input
              type="text"
              value={searchFilters.price}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Search price"
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

          <DataTable
            columns={columns}
            data={paginatedInventory}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <Modal
            isOpen={modalOpen}
            title={editingItem ? 'Edit Item' : 'New Item'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingItem ? 'Update' : 'Add'}
          >
            <form>
              <div className="form-group">
                <label>Item Type</label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                  required
                >
                  <option value="">Select item type</option>
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Jersey Type (Optional)</label>
                <input
                  type="text"
                  value={formData.jerseyType}
                  onChange={(e) => setFormData({ ...formData, jerseyType: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div className="form-group">
                <label>Size</label>
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
                <label>Number</label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="Enter number"
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
            </form>
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Inventory;
