import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/inventory', label: 'Inventory', icon: '📦', permission: 'INVENTORY' },
    { path: '/orders', label: 'Inventory Orders', icon: '📋', permission: 'ORDERS' },
    { path: '/customized-orders', label: 'Customized Orders', icon: '🏭', permission: 'ORDERS' },
    { path: '/teams', label: 'Teams', icon: '👥', permission: 'ORDERS' },
    { path: '/clients', label: 'Clients', icon: '👤', permission: 'CLIENTS' },
    { path: '/attendance', label: 'Attendance', icon: '✓', permission: 'ATTENDANCE' },
  ];

  const adminItems = [
    { path: '/income', label: 'Finance', icon: '💰' },
    { path: '/employees', label: 'Employees', icon: '👨‍💼' },
  ];

  const canAccess = (permission) => {
    if (!permission) return true;
    return user?.role === 'ADMIN' || user?.permissions?.some((p) => p.pageName === permission);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-menu">
        <div className="menu-section">
          <ul>
            {menuItems.map(
              (item) =>
                canAccess(item.permission) && (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                      onClick={toggleSidebar}
                    >
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-label">{item.label}</span>
                    </Link>
                  </li>
                )
            )}
          </ul>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="menu-section admin-section">
            <h3 className="section-title">ADMIN</h3>
            <ul>
              {adminItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                    onClick={toggleSidebar}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
