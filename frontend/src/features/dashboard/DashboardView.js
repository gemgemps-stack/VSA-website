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

  return (
    <DashboardLayout>
      <div className="dashboard">
        <h1>Dashboard</h1>
        <p className="welcome">Welcome, {user?.username}!</p>

        <div className="stats-grid">
          <PermissionGuard permission="INVENTORY_ORDERS">
            <div className="stat-card" onClick={() => navigate('/orders')}>
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>Orders</h3>
                <p className="stat-value">{stats.totalOrders}</p>
              </div>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="CLIENTS">
            <div className="stat-card" onClick={() => navigate('/clients')}>
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <h3>Registered Clients</h3>
                <p className="stat-value">{stats.totalClients}</p>
              </div>
            </div>
          </PermissionGuard>

          <PermissionGuard permission="INVENTORY">
            <div className="stat-card" onClick={() => navigate('/inventory')}>
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Inventory</h3>
                <p className="stat-value">{stats.totalInventory}</p>
              </div>
            </div>
          </PermissionGuard>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
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
