import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import PermissionGuard from '../components/PermissionGuard';
import clientService from '../services/clientService';

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const RegisterClient = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    contactNumber: '',
    vip: 'REGULAR',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await clientService.createClient({
        clientName: formData.clientName,
        contactNumber: formData.contactNumber,
        vip: formData.vip === 'VIP',
        notes: formData.notes,
      });

      alert('Client registered successfully');
      setFormData({
        clientName: '',
        contactNumber: '',
        vip: 'REGULAR',
        notes: '',
      });
    } catch (error) {
      console.error('Error registering client:', error);
      alert(error.response?.data?.message || 'Failed to register client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="CLIENTS">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Register a Client</h1>
          </div>

          <div className="form-card">
            <form onSubmit={handleSubmit}>
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
                <label>Phone Number *</label>
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
                <label>Client Type *</label>
                <select
                  value={formData.vip}
                  onChange={(e) => setFormData({ ...formData, vip: e.target.value })}
                  required
                >
                  <option value="REGULAR">Regular</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="4"
                  placeholder="Add any extra client details here"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register Client'}
              </button>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default RegisterClient;
