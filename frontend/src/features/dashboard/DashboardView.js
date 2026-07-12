import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalClients: 0,
    totalInventory: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardService.getStats();
      setStats(
        response.data || {
          totalOrders: 0,
          totalClients: 0,
          totalInventory: 0,
        }
      );
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const heroStats = [
    { label: 'Orders', value: stats.totalOrders, path: '/orders', permission: 'INVENTORY_ORDERS' },
    { label: 'Clients', value: stats.totalClients, path: '/clients', permission: 'CLIENTS' },
    { label: 'Inventory', value: stats.totalInventory, path: '/inventory', permission: 'INVENTORY' },
  ];

  return (
    <DashboardLayout>
      <div className="dashboard">
        <div className="dashboard-hero">
          <div>
            <span className="page-eyebrow">Operations overview</span>
            <h1>Dashboard</h1>
            <p className="welcome">Welcome back, {user?.username || 'there'} — here’s a concise view of the day’s key business areas.</p>
          </div>
          <div className="hero-badge">Live snapshot</div>
        </div>

        <div className="stats-grid">
          {heroStats.map((item) => (
            <PermissionGuard key={item.label} permission={item.permission}>
              <div className="stat-card" onClick={() => navigate(item.path)}>
                <div className="stat-icon">
                  {item.label === 'Orders' ? '📋' : item.label === 'Clients' ? '👤' : '📦'}
                </div>
                <div className="stat-content">
                  <h3>{item.label}</h3>
                  <p className="stat-value">{item.value}</p>
                </div>
              </div>
            </PermissionGuard>
          ))}
        </div>

        <div className="quick-actions">
          <div className="quick-actions-header">
            <h2>Quick Actions</h2>
            <p>Jump to the area you need right away.</p>
          </div>
          <div className="actions-grid">
            <PermissionGuard permission="INVENTORY_ORDERS">
              <button className="action-btn" onClick={() => navigate('/orders')}>
                📋 View Orders
              </button>
            </PermissionGuard>

            <PermissionGuard permission="INVENTORY">
              <button className="action-btn" onClick={() => navigate('/inventory')}>
                📦 Manage Inventory
              </button>
            </PermissionGuard>

            <PermissionGuard permission="CLIENTS">
              <button className="action-btn" onClick={() => navigate('/clients')}>
                👤 Manage Clients
              </button>
            </PermissionGuard>

            <PermissionGuard permission="ATTENDANCE">
              <button className="action-btn" onClick={() => navigate('/attendance')}>
                ✓ View Attendance
              </button>
            </PermissionGuard>

            <PermissionGuard permission="EMPLOYEES">
              <button className="action-btn" onClick={() => navigate('/employees')}>
                👨‍💼 Manage Employees
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
