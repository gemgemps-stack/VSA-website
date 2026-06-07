import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import orderService from '../../services/orderService';

const SourceIncome = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const FULLY_PAID_STATUS = 'FULLY_PAID';

  const sourceGrids = [
    { key: 'vsaOnline', label: 'VSA Online Shop', color: '#016667' },
    { key: 'tiktokShop', label: 'Tiktok Shop', color: '#d9b26f' },
    { key: 'shopeeShop', label: 'Shoppee', color: '#f77f00' },
    { key: 'sportsApparelShop', label: 'Verdida Sports Apparel', color: '#2d6a4f' },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders(0, 1000);
      setOrders(response.data.content || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getOrderTotal = (order) => {
    const price = Number.parseFloat(order.price) || 0;
    const quantity = Number.parseInt(order.quantity, 10) || 0;
    const discountPercent = Number.parseFloat(order.discount) || 0;
    const baseTotal = price * quantity;
    return baseTotal * (1 - discountPercent / 100);
  };

  const getTotalBySource = (sourceLabel) => {
    return orders.reduce((total, order) => {
      if ((order.shop || '').toLowerCase() !== sourceLabel.toLowerCase()) {
        return total;
      }

      if ((order.status || '').toUpperCase() !== FULLY_PAID_STATUS) {
        return total;
      }

      return total + getOrderTotal(order);
    }, 0);
  };

  const getTotalIncome = () => {
    return sourceGrids.reduce((grandTotal, source) => {
      return grandTotal + getTotalBySource(source.label);
    }, 0);
  };

  const getSourceEntries = (sourceLabel) => {
    return orders
      .filter(
        (order) =>
          (order.shop || '').toLowerCase() === sourceLabel.toLowerCase() &&
          (order.status || '').toUpperCase() === FULLY_PAID_STATUS
      )
      .sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));
  };

  const openDetails = (source) => {
    setSelectedSource(source);
  };

  const closeDetails = () => {
    setSelectedSource(null);
  };

  return (
    <PermissionGuard permission="SOURCE_OF_INCOME">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Source of Income</h1>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="income-grids-container">
              <div className="income-shop-grids">
                {sourceGrids.map((grid) => (
                  <div
                    key={grid.key}
                    className="income-grid-card"
                    style={{ borderLeftColor: grid.color }}
                  >
                    <h3>{grid.label}</h3>
                    <p className="income-grid-value">
                      PHP {getTotalBySource(grid.label).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      className="income-details-btn"
                      onClick={() => openDetails(grid)}
                    >
                      Details
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="income-grid-card income-total-card"
                style={{
                  borderLeftColor: '#111827',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f7faf9 100%)',
                }}
              >
                <h3>Total Income</h3>
                <p className="income-grid-value">PHP {getTotalIncome().toFixed(2)}</p>
              </div>
            </div>
          )}

          <Modal
            isOpen={Boolean(selectedSource)}
            title={selectedSource ? `${selectedSource.label} Details` : 'Income Details'}
            onClose={closeDetails}
            cancelText="Close"
          >
            {selectedSource && (
              <div className="income-details-modal">
                <div className="income-details-summary">
                  <div>
                    <span className="income-details-label">Total</span>
                    <strong>PHP {getTotalBySource(selectedSource.label).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Orders</span>
                    <strong>{getSourceEntries(selectedSource.label).length}</strong>
                  </div>
                </div>

                <div className="income-details-list">
                  {getSourceEntries(selectedSource.label).length > 0 ? (
                    getSourceEntries(selectedSource.label).map((order) => (
                      <div key={order.id} className="income-detail-row">
                        <span>
                          {order.orderDate || order.createdAt?.slice?.(0, 10) || 'No date'}
                        </span>
                        <strong>PHP {getOrderTotal(order).toFixed(2)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="income-details-empty">No orders found for this shop.</p>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default SourceIncome;
