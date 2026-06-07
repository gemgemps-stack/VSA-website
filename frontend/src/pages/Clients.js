import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import PermissionGuard from '../components/PermissionGuard';
import clientService from '../services/clientService';
import { useCallback } from 'react';

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    clientName: '',
    contactNumber: '',
    vip: false,
    notes: '',
  });

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientService.getAllClients(currentPage - 1, 10);
      setClients(response.data.content || []);
      setTotalPages(Math.ceil((response.data.totalElements || 0) / 10));
    } catch (error) {
      console.error('Error loading clients:', error);
      alert('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      clientName: client.clientName,
      contactNumber: client.contactNumber,
      vip: client.vip,
      notes: client.notes,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await clientService.deleteClient(id);
      alert('Client deleted successfully');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient.id, formData);
        alert('Client updated successfully');
      } else {
        await clientService.createClient(formData);
        alert('Client created successfully');
      }
      setModalOpen(false);
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    }
  };

  const columns = [
    { key: 'clientName', label: 'Name' },
    { key: 'contactNumber', label: 'Contact' },
    { 
      key: 'vip', 
      label: 'VIP',
      render: (value) => value ? '💎 Yes' : '⭐No'
    },
  ];

  return (
    <PermissionGuard permission="CLIENTS">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Clients</h1>
            <button 
              className="btn-primary"
              onClick={() => {
                setEditingClient(null);
                setFormData({
                  clientName: '',
                  contactNumber: '',
                  vip: false,
                  notes: '',
                });
                setModalOpen(true);
              }}
            >
              ➕ Register New Client
            </button>
          </div>

          <DataTable
            columns={columns}
            data={clients}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <Modal
            isOpen={modalOpen}
            title={editingClient ? 'Edit Client' : 'New Client'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingClient ? 'Update' : 'Create'}
          >
            <form>
              <div className="form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactNumber: formatPhoneNumber(e.target.value),
                    })
                  }
                  placeholder="0917-123-4567"
                  maxLength={13}
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.vip}
                    onChange={(e) => setFormData({ ...formData, vip: e.target.checked })}
                  />
                  VIP Client
                </label>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>
            </form>
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Clients;
