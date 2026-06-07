import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import inventoryService from '../../services/inventoryService';

const ITEM_TYPE_OPTIONS = ['Jersey', 'Polo Shirt', 'Chinese Collar', 'Ready Made'];
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

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemType: '',
    jerseyType: '',
    name: '',
    quantity: '',
    price: '',
  });

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

  const filteredInventory = inventory.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return true;
    }

    const itemType = (item.itemType || '').toLowerCase();
    const jerseyType = (item.jerseyType || '').toLowerCase();
    return itemType.includes(term) || jerseyType.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / 10));
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * 10, currentPage * 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemType: item.itemType || 'Jersey',
      jerseyType: item.jerseyType || '',
      name: item.name,
      quantity: item.quantity,
      price: item.price,
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
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save item';
      alert(`Failed to save item: ${errorMessage}`);
    }
  };

  const columns = [
    { key: 'itemType', label: 'Item Type' },
    {
      key: 'jerseyType',
      label: 'Jersey Type',
      render: (value) => value || '-',
    },
    { key: 'name', label: 'Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'price', label: 'Price' },
    {
      key: 'createdAt',
      label: 'Date Created',
      render: (value) => formatDateCreated(value),
    },
  ];

  return (
    <PermissionGuard permission="INVENTORY">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Inventory</h1>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  itemType: '',
                  jerseyType: '',
                  name: '',
                  quantity: '',
                  price: '',
                });
                setModalOpen(true);
              }}
            >
              + Add Item
            </button>
          </div>

          <div className="inventory-search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔎 Search Item Type or Jersey Type"
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      itemType: e.target.value,
                      jerseyType: e.target.value === 'Jersey' ? formData.jerseyType : '',
                    })
                  }
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

              {formData.itemType === 'Jersey' && (
                <div className="form-group">
                  <label>Jersey Type (Optional)</label>
                  <input
                    type="text"
                    value={formData.jerseyType}
                    onChange={(e) => setFormData({ ...formData, jerseyType: e.target.value })}
                  />
                </div>
              )}

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
