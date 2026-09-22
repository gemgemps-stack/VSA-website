import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import SearchField from '../../components/SearchField';
import { useNotification } from '../../context/NotificationContext';
import clientService from '../../services/clientService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const formatPhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const formatMoney = (value) => `PHP ${(Number(value) || 0).toFixed(2)}`;

const styles = {
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px 18px',
    padding: '14px 0',
    borderBottom: '1px solid #eee',
    marginBottom: '8px',
  },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  detailLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#777',
  },
  detailValue: { fontSize: '0.95rem', color: '#222' },
  sectionTitle: { margin: '12px 0 8px', fontSize: '1rem', color: '#333' },
  subSectionTitle: { margin: '10px 0 6px', fontSize: '0.9rem', color: '#555' },
  subList: {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  subItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    background: '#fff',
  },
  subRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '0.9rem',
    color: '#444',
  },
  subTitle: { fontSize: '0.95rem', fontWeight: '600', color: '#111' },
  hint: { fontSize: '0.9rem', color: '#666', fontStyle: 'italic', margin: '6px 0' },
  empty: { padding: '14px 0', fontSize: '0.9rem', color: '#666' },
};

const OrderSummaryList = ({ orders, label }) => {
  if (!orders || orders.length === 0) {
    return <p style={styles.hint}>No {label.toLowerCase()} available for this client yet.</p>;
  }

  return (
    <ul style={styles.subList}>
      {orders.map((order) => (
        <li key={order.id} style={styles.subItem}>
          <div style={styles.subRow}>
            <strong style={styles.subTitle}>{order.jobOrderNo || '-'}</strong>
            <span>{order.shop || '-'}</span>
          </div>
          <div style={styles.subRow}>
            <span>Ordered: {order.orderDate || '-'}</span>
            <span>Status: {order.status || '-'}</span>
          </div>
          <div style={styles.subRow}>
            <span>
              Total: {formatMoney((Number(order.price) || 0) * (Number(order.quantity) || 1))}
            </span>
            {order.pickupDate ? <span>Pickup: {order.pickupDate}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
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
  const [detailsClient, setDetailsClient] = useState(null);
  const [clientOrders, setClientOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    contactNumber: '',
    vip: false,
    notes: '',
    companySchool: '',
    cityMunicipality: '',
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

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      clientName: '',
      contactNumber: '',
      vip: false,
      notes: '',
      companySchool: '',
      cityMunicipality: '',
    });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      clientName: client.clientName || '',
      contactNumber: client.contactNumber || '',
      vip: Boolean(client.vip),
      notes: client.notes || '',
      companySchool: client.companySchool || '',
      cityMunicipality: client.cityMunicipality || '',
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
      const payload = {
        clientName: formData.clientName.trim(),
        contactNumber: formData.contactNumber.trim(),
        vip: Boolean(formData.vip),
        notes: formData.notes.trim(),
        companySchool: formData.companySchool.trim(),
        cityMunicipality: formData.cityMunicipality.trim(),
      };

      if (!payload.clientName || !payload.contactNumber) {
        notifyError('Client name and contact number are required.');
        return;
      }

      if (editingClient) {
        await clientService.updateClient(editingClient.id, payload);
        notifySuccess('Client updated successfully');
      } else {
        await clientService.createClient(payload);
        notifySuccess('Client created successfully');
      }

      setModalOpen(false);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      const errorMsg = getApiErrorMessage(error, 'Failed to save client');
      notifyError(errorMsg);
    }
  };

  const handleViewDetails = (client) => {
    setDetailsClient(client);
    setClientOrders(null);
  };

  const closeDetails = () => {
    setDetailsClient(null);
    setClientOrders(null);
    setOrdersLoading(false);
  };

  const loadClientOrders = async () => {
    if (!detailsClient) return;
    try {
      setOrdersLoading(true);
      const response = await clientService.getClientOrders(detailsClient.id);
      setClientOrders(response.data || {});
    } catch (error) {
      console.error('Error loading client orders:', error);
      const errorMsg = getApiErrorMessage(error, 'Failed to load client orders');
      alert(`Failed to load orders: ${errorMsg}`);
    } finally {
      setOrdersLoading(false);
    }
  };

  const columns = [
    { key: 'clientCode', label: 'ID', render: (value) => value || '-' },
    { key: 'clientName', label: 'Name' },
    { key: 'contactNumber', label: 'Contact' },
    {
      key: 'vip',
      label: 'Tier',
      render: (value) => (value ? 'VIP' : 'Standard'),
    },
  ];

  const filteredClients = clients.filter((client) => {
    const haystack = [
      client.clientCode,
      client.clientName,
      client.contactNumber,
      client.vip ? 'vip' : 'standard',
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
              <span style={sectionIconBadgeStyle} aria-hidden="true">
                <SectionIcon variant="clients" />
              </span>
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
                  resetForm();
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
              <SearchField
                className="client-search-bar"
                wrapperProps={{ 'aria-label': 'Client search' }}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search clients by name, contact, or notes"
              />
            </div>

            {filteredClients.length === 0 ? (
              <div className="empty-state">
                <span style={{ ...sectionIconBadgeStyle, marginBottom: '12px' }} aria-hidden="true">
                  <SectionIcon variant="clients" />
                </span>
                <h3>No clients match this search yet</h3>
                <p>Try a broader term or register a new client to build your directory.</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredClients}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleViewDetails}
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
              <form className="form-card" style={{ padding: 0, boxShadow: 'none', border: 'none', background: 'transparent', maxWidth: 'none' }}>
                <div className="employee-modal-grid">
                  <div className="form-group">
                    <label>Client Name *</label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Enter client name"
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
                    <label>Company / School</label>
                    <input
                      type="text"
                      value={formData.companySchool}
                      onChange={(e) => setFormData({ ...formData, companySchool: e.target.value })}
                      placeholder="Company or school (optional)"
                    />
                  </div>
                  <div className="form-group">
                    <label>City / Municipality</label>
                    <input
                      type="text"
                      value={formData.cityMunicipality}
                      onChange={(e) =>
                        setFormData({ ...formData, cityMunicipality: e.target.value })
                      }
                      placeholder="City or municipality (optional)"
                    />
                  </div>
                  <div className="form-group">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.vip}
                        onChange={(e) => setFormData({ ...formData, vip: e.target.checked })}
                      />
                      <span>VIP Client</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      placeholder="Optional notes about the client"
                    />
                  </div>
                </div>
              </form>
            </Modal>

            <Modal
              isOpen={detailsClient !== null}
              title={detailsClient ? `${detailsClient.clientName || 'Client'} - Client Overview` : ''}
              onClose={closeDetails}
              onSubmit={clientOrders ? loadClientOrders : undefined}
              submitText={clientOrders ? 'Refresh Orders' : 'View Orders'}
              loading={ordersLoading}
              size="large"
            >
              {detailsClient && (
                <div style={{ padding: 0 }}>
                  <div style={styles.detailGrid}>
                    {[
                      { label: 'ID', value: detailsClient.clientCode },
                      { label: 'Name', value: detailsClient.clientName },
                      { label: 'Contact', value: detailsClient.contactNumber },
                      { label: 'Tier', value: detailsClient.vip ? 'VIP' : 'Standard' },
                      { label: 'Company / School', value: detailsClient.companySchool },
                      { label: 'City / Municipality', value: detailsClient.cityMunicipality },
                      { label: 'Notes', value: detailsClient.notes },
                    ].map((item) => (
                      <div key={item.label} style={styles.detailItem}>
                        <span style={styles.detailLabel}>{item.label}</span>
                        <span style={styles.detailValue}>{item.value || '-'}</span>
                      </div>
                    ))}
                  </div>

                  <h4 style={styles.sectionTitle}>Orders</h4>
                  {ordersLoading ? (
                    <p style={styles.hint}>Loading orders...</p>
                  ) : clientOrders ? (
                    !clientOrders.orders?.length && !clientOrders.customizedOrders?.length ? (
                      <p style={styles.empty}>This client has no orders yet.</p>
                    ) : (
                      <>
                        <h5 style={styles.subSectionTitle}>Regular Orders</h5>
                        <OrderSummaryList orders={clientOrders.orders} label="Regular orders" />
                        <h5 style={styles.subSectionTitle}>Customized Orders</h5>
                        <OrderSummaryList
                          orders={clientOrders.customizedOrders}
                          label="Customized orders"
                        />
                      </>
                    )
                  ) : (
                    <p style={styles.hint}>
                      Select "View Orders" below to load this client's order history.
                    </p>
                  )}
                </div>
              )}
            </Modal>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Clients;
