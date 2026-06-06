import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import PermissionGuard from '../components/PermissionGuard';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import clientService from '../services/clientService';
import inventoryService from '../services/inventoryService';
import incomeService from '../services/incomeService';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalClients: 0,
    totalInventory: 0,
    totalIncome: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [ordersRes, clientsRes, inventoryRes, incomeRes] = await Promise.all([
        orderService.getAllOrders(0, 1).catch(() => ({ data: { content: [] } })),
        clientService.getAllClients(0, 1).catch(() => ({ data: { content: [] } })),
        inventoryService.getAllInventory(0, 1).catch(() => ({ data: { content: [] } })),
        incomeService.getAllIncomeSources(0, 1).catch(() => ({ data: { content: [] } })),
      ]);

      setStats({
        totalOrders: ordersRes.data.totalElements || 0,
        totalClients: clientsRes.data.totalElements || 0,
        totalInventory: inventoryRes.data.totalElements || 0,
        totalIncome: incomeRes.data.totalElements || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard">
        <h1>Dashboard</h1>
        <p className="welcome">Welcome, {user?.username}! 👋</p>

        <div className="stats-grid">
          <PermissionGuard permission="ORDERS">
            <div className="stat-card" onClick={() => navigate('/orders')}>
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <h3>Total Orders</h3>
                <p className="stat-value">{stats.totalOrders}</p>
              </div>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="CLIENTS">
            <div className="stat-card" onClick={() => navigate('/clients')}>
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Clients</h3>
                <p className="stat-value">{stats.totalClients}</p>
              </div>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="INVENTORY">
            <div className="stat-card" onClick={() => navigate('/inventory')}>
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Total Inventory</h3>
                <p className="stat-value">{stats.totalInventory}</p>
              </div>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="SOURCE_OF_INCOME">
            <div className="stat-card" onClick={() => navigate('/income')}>
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Total Income Sources</h3>
                <p className="stat-value">{stats.totalIncome}</p>
              </div>
            </div>
          </PermissionGuard>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <PermissionGuard permission="ORDERS">
              <button className="action-btn" onClick={() => navigate('/orders')}>
                🛒  View Orders
              </button>
            </PermissionGuard>
            
            <PermissionGuard permission="INVENTORY">
              <button className="action-btn" onClick={() => navigate('/inventory')}>
                📦 Manage Inventory
              </button>
            </PermissionGuard>
            
            <PermissionGuard permission="CLIENTS">
              <button className="action-btn" onClick={() => navigate('/clients')}>
                👥 Manage Clients
              </button>
            </PermissionGuard>
            
            <PermissionGuard permission="SOURCE_OF_INCOME">
              <button className="action-btn" onClick={() => navigate('/income')}>
                💰 View Income
              </button>
            </PermissionGuard>

            {user?.role === 'ADMIN' && (
              <>
                <button className="action-btn" onClick={() => navigate('/register-user')}>
                  ➕ Register User
                </button>
                <button className="action-btn" onClick={() => navigate('/registered-users')}>
                  👨‍💼 Manage Users
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
