import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import { useNotification } from '../../context/NotificationContext';
import clientService from '../../services/clientService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const Clients = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      setTotalPages(Math.max(1, Math.ceil((response.data.totalElements || 0) / 10)));
    } catch (error) {
      console.error('Error loading clients:', error);
      if (isAuthOrPermissionError(error)) {
        return;
      }
      const errorMsg = getApiErrorMessage(error, 'Failed to load clients');
      notifyError(`Failed to load clients: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, notifyError]);

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
      notifySuccess('Client deleted successfully');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      notifyError('Failed to delete client');
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient.id, formData);
        notifySuccess('Client updated successfully');
      } else {
        await clientService.createClient(formData);
        notifySuccess('Client created successfully');
      }
      setModalOpen(false);
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      const errorMsg = getApiErrorMessage(error, 'Failed to save client');
      notifyError(errorMsg);
    }
  };

  const columns = [
    { key: 'clientCode', label: 'ID', render: (value) => value || '-' },
    { key: 'clientName', label: 'Name' },
    { key: 'contactNumber', label: 'Contact' },
    {
      key: 'vip',
      label: 'VIP',
      render: (value) => (value ? '💎 Yes' : '⭐ No'),
    },
  ];

  const filteredClients = clients.filter((client) => {
    const haystack = [
      client.clientCode,
      client.clientName,
      client.contactNumber,
      client.vip ? 'vip' : 'regular',
      client.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const clientStats = [
    { label: 'Total clients', value: clients.length, detail: 'Stored profiles' },
    { label: 'VIP clients', value: clients.filter((client) => client.vip).length, detail: 'Priority accounts' },
    { label: 'Visible now', value: filteredClients.length, detail: 'Matching your search' },
  ];

  return (
    <PermissionGuard permission="CLIENTS">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <div className="page-title-block">
              <span className="page-eyebrow">Client relationships</span>
              <h1>Clients</h1>
              <p className="page-subtitle">
                Keep every account easy to find, segment, and maintain with a cleaner client view.
              </p>
            </div>
            <div className="page-actions">
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
                type="button"
              >
                Register Client
              </button>
            </div>
          </div>

          <div className="content-surface">
            <div className="content-surface-header">
              <div>
                <h2>Client directory</h2>
                <p>Search for contacts, spot VIP accounts, and keep notes just a click away.</p>
              </div>
              <div className="stats-strip">
                {clientStats.map((stat) => (
                  <div key={stat.label} className="stat-pill">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                    <small>{stat.detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="search-and-filter-row">
              <div className="client-search-bar">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="⌕ Search clients by name, contact, or notes"
                />
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="empty-state">
                <h3>No clients match this search yet</h3>
                <p>Try a broader term or register a new client to build your directory.</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredClients}
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
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Clients;
