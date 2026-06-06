import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Modal from '../components/Modal';
import PermissionGuard from '../components/PermissionGuard';
import orderService from '../services/orderService';

const PAYMENT_METHODS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit'];
const FULLY_PAID_STATUS = 'FULLY_PAID';

const PaymentMethods = () => {
  const [paymentData, setPaymentData] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    accountDetails: '',
    isActive: true,
  });

  useEffect(() => {
    loadPaymentMethods();
    loadOrders();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      // Initialize payment data from localStorage
      const stored = localStorage.getItem('paymentMethods');
      if (stored) {
        setPaymentData(JSON.parse(stored));
      } else {
        const initialized = {};
        PAYMENT_METHODS.forEach(method => {
          initialized[method] = {
            name: method,
            description: '',
            accountDetails: '',
            isActive: true,
          };
        });
        setPaymentData(initialized);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      alert('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await orderService.getAllOrders(0, 1000);
      setOrders(response.data.content || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const getOrderTotal = (order) => {
    const price = Number.parseFloat(order.price) || 0;
    const quantity = Number.parseInt(order.quantity, 10) || 0;
    const discountPercent = Number.parseFloat(order.discount) || 0;
    const baseTotal = price * quantity;
    return baseTotal * (1 - discountPercent / 100);
  };

  const getTotalByMethod = (method) => {
    return orders.reduce((total, order) => {
      if ((order.modeOfPayment || '').toLowerCase() !== method.toLowerCase()) {
        return total;
      }
      if ((order.status || '').toUpperCase() !== FULLY_PAID_STATUS) {
        return total;
      }
      return total + getOrderTotal(order);
    }, 0);
  };

  const getMethodOrderCount = (method) => {
    return orders.filter(
      (order) =>
        (order.modeOfPayment || '').toLowerCase() === method.toLowerCase() &&
        (order.status || '').toUpperCase() === FULLY_PAID_STATUS
    ).length;
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    const current = paymentData[method] || {};
    setFormData({
      description: current.description || '',
      accountDetails: current.accountDetails || '',
      isActive: current.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingMethod) {
        const updated = {
          ...paymentData,
          [editingMethod]: {
            name: editingMethod,
            ...formData,
          },
        };
        setPaymentData(updated);
        localStorage.setItem('paymentMethods', JSON.stringify(updated));
        alert('Payment method updated successfully');
      }
      setModalOpen(false);
      setEditingMethod(null);
    } catch (error) {
      console.error('Error saving payment method:', error);
      alert('Failed to save payment method');
    }
  };

  return (
    <PermissionGuard permission="ADMIN">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Payment Methods</h1>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="payment-methods-grid">
              {PAYMENT_METHODS.map((method) => {
                const data = paymentData[method] || {};
                return (
                  <div
                    key={method}
                    className={`payment-method-card ${data.isActive ? 'active' : 'inactive'}`}
                  >
                    <div className="payment-method-header">
                      <h3>{method}</h3>
                      <span className={`status-badge ${data.isActive ? 'active' : 'inactive'}`}>
                        {data.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="payment-method-content">
                      {data.description && (
                        <div className="payment-detail">
                          <label>Description:</label>
                          <p>{data.description}</p>
                        </div>
                      )}
                      {data.accountDetails && (
                        <div className="payment-detail">
                          <label>Account Details:</label>
                          <p>{data.accountDetails}</p>
                        </div>
                      )}
                      {!data.description && !data.accountDetails && (
                        <p className="no-details">No details configured</p>
                      )}

                      <div className="payment-detail">
                        <label>Total Income From Orders:</label>
                        <p>PHP {getTotalByMethod(method).toFixed(2)}</p>
                      </div>

                      <div className="payment-detail">
                        <label>Orders:</label>
                        <p>{getMethodOrderCount(method)}</p>
                      </div>
                    </div>

                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(method)}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Modal
            isOpen={modalOpen}
            title={`Edit ${editingMethod} Payment Method`}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText="Update"
          >
            <form>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter payment method description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Account Details</label>
                <textarea
                  value={formData.accountDetails}
                  onChange={(e) => setFormData({ ...formData, accountDetails: e.target.value })}
                  placeholder="Enter account details (e.g., account number, phone, etc.)"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </form>
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default PaymentMethods;
