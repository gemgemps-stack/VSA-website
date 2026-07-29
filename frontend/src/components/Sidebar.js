import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import '../styles/Sidebar.css';

const MenuIcon = ({ name }) => {
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12.5V6.75C4 5.78 4.78 5 5.75 5h4.5C11.22 5 12 5.78 12 6.75v5.75" />
          <path d="M12 12.5V6.75C12 5.78 12.78 5 13.75 5h4.5C19.22 5 20 5.78 20 6.75V12.5" />
          <path d="M4 12.5h16V17.25C20 18.22 19.22 19 18.25 19H5.75C4.78 19 4 18.22 4 17.25V12.5Z" />
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
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 11.5h7" />
          <path d="M8.5 15h4.5" />
        </svg>
      );
    case 'customized':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5.5h6l3 4.5-6 9-6-9z" />
          <path d="M9 5.5 12 10l3-4.5" />
          <path d="M9.75 11.25h4.5" />
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
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.75 8.5h10.5A2 2 0 0 1 18.25 10.5v6A2 2 0 0 1 16.25 18.5h-10A1.5 1.5 0 0 1 4.75 17V10a1.5 1.5 0 0 1 1-1.5Z" />
          <path d="M5.75 11h9.5" />
          <path d="M14.25 11.5h2.75A1.25 1.25 0 0 1 18.25 12.75v1.5A1.25 1.25 0 0 1 17 15.5h-2.75" />
          <path d="M15.5 13a0.75 0.75 0 1 0 0 1.5 0.75 0.75 0 0 0 0-1.5Z" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5.25h10v13.5H7z" />
          <path d="M7 8.25h10" />
          <path d="M9.5 12.5h5" />
          <path d="M9.5 15h5" />
          <path d="M12 8.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
          <path d="M12 12.75v2.75" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h12v12H6z" />
        </svg>
      );
  }
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/inventory', label: 'Inventory', icon: 'inventory', permission: 'INVENTORY' },
    { path: '/orders', label: 'Inventory Orders', icon: 'orders', permission: 'INVENTORY_ORDERS' },
    { path: '/customized-orders', label: 'Customized Orders', icon: 'customized', permission: 'CUSTOMIZED_ORDERS' },
    { path: '/clients', label: 'Clients', icon: 'clients', permission: 'CLIENTS' },
    { path: '/attendance', label: 'Attendance', icon: 'attendance', permission: 'ATTENDANCE' },
  ];

  const managementItems = [
    { path: '/income', label: 'Finance', icon: 'finance', permission: 'SOURCE_OF_INCOME' },
    { path: '/employees', label: 'Employees', icon: 'employees', permission: 'EMPLOYEES' },
  ];

  const canAccess = (permission) => {
    if (!permission) return true;
    return hasPermission(user?.permissions, permission);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
                      <span className="menu-icon" aria-hidden="true">
                        <MenuIcon name={item.icon} />
                      </span>
                      <span className="menu-label">{item.label}</span>
                    </Link>
                  </li>
                )
            )}
          </ul>
        </div>

        {managementItems.some((item) => canAccess(item.permission)) && (
          <div className="menu-section admin-section">
            <h3 className="section-title">MANAGEMENT</h3>
            <ul>
              {managementItems.map(
                (item) =>
                  canAccess(item.permission) && (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={location.pathname === item.path ? 'active' : ''}
                        onClick={toggleSidebar}
                      >
                        <span className="menu-icon" aria-hidden="true">
                          <MenuIcon name={item.icon} />
                        </span>
                        <span className="menu-label">{item.label}</span>
                      </Link>
                    </li>
                  )
              )}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
