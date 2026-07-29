import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import '../../styles/Dashboard.css';

const StatIcon = ({ name }) => {
  switch (name) {
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 11.5h7" />
          <path d="M8.5 15h4.5" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 18.25a4.25 4.25 0 0 1 8.5 0" />
          <path d="M15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M14.25 18.25a3.75 3.75 0 0 1 6.25 0" />
        </svg>
      );
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 7.5 12 4l5.5 3.5v6.5L12 17.5l-5.5-3.5z" />
          <path d="M12 17.5V11" />
          <path d="M6.75 7.25 12 10.5l5.25-3.25" />
        </svg>
      );
    default:
      return null;
  }
};

const ActionIcon = ({ name }) => {
  switch (name) {
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 11.5h7" />
          <path d="M8.5 15h4.5" />
        </svg>
      );
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 7.5 12 4l5.5 3.5v6.5L12 17.5l-5.5-3.5z" />
          <path d="M12 17.5V11" />
          <path d="M6.75 7.25 12 10.5l5.25-3.25" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 18.25a4.25 4.25 0 0 1 8.5 0" />
          <path d="M15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M14.25 18.25a3.75 3.75 0 0 1 6.25 0" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8 3.75V6" />
          <path d="M16 3.75V6" />
          <path d="M8 10h8" />
          <path d="m9.5 14 1.75 1.75L15 12" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M4.75 19a5.25 5.25 0 0 1 10.5 0" />
          <path d="M16.5 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
          <path d="M14.75 19a4.5 4.5 0 0 1 7.5 0" />
        </svg>
      );
    default:
      return null;
  }
};

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
    {
      label: 'Orders',
      icon: 'orders',
      value: stats.totalOrders,
      path: '/orders',
      permission: 'INVENTORY_ORDERS',
    },
    {
      label: 'Clients',
      icon: 'clients',
      value: stats.totalClients,
      path: '/clients',
      permission: 'CLIENTS',
    },
    {
      label: 'Inventory',
      icon: 'inventory',
      value: stats.totalInventory,
      path: '/inventory',
      permission: 'INVENTORY',
    },
  ];

  const quickActions = [
    { label: 'View Orders', icon: 'orders', permission: 'INVENTORY_ORDERS', path: '/orders' },
    { label: 'Manage Inventory', icon: 'inventory', permission: 'INVENTORY', path: '/inventory' },
    { label: 'Manage Clients', icon: 'clients', permission: 'CLIENTS', path: '/clients' },
    { label: 'View Attendance', icon: 'attendance', permission: 'ATTENDANCE', path: '/attendance' },
    { label: 'Manage Employees', icon: 'employees', permission: 'EMPLOYEES', path: '/employees' },
  ];

  return (
    <DashboardLayout>
      <div className="dashboard">
        <div className="dashboard-hero">
          <div>
            <span className="page-eyebrow">Operations overview</span>
            <h1>Dashboard</h1>
            <p className="welcome">
              Welcome back, {user?.username || 'there'}. Here&apos;s a concise view of the day&apos;s key business areas.
            </p>
          </div>
          <div className="hero-badge">Live snapshot</div>
        </div>

        <div className="stats-grid">
          {heroStats.map((item) => (
            <PermissionGuard key={item.label} permission={item.permission}>
              <button className="stat-card" type="button" onClick={() => navigate(item.path)}>
                <span className="stat-icon" aria-hidden="true">
                  <StatIcon name={item.icon} />
                </span>
                <span className="stat-content">
                  <span className="stat-label">{item.label}</span>
                  <span className="stat-value">{item.value}</span>
                </span>
              </button>
            </PermissionGuard>
          ))}
        </div>

        <div className="quick-actions">
          <div className="quick-actions-header">
            <h2>Quick Actions</h2>
            <p>Jump to the area you need right away.</p>
          </div>
          <div className="actions-grid">
            {quickActions.map((action) => (
              <PermissionGuard key={action.label} permission={action.permission}>
                <button className="action-btn" type="button" onClick={() => navigate(action.path)}>
                  <span className="action-icon" aria-hidden="true">
                    <ActionIcon name={action.icon} />
                  </span>
                  <span className="action-label">{action.label}</span>
                  <span className="action-arrow" aria-hidden="true">
                    -&gt;
                  </span>
                </button>
              </PermissionGuard>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
