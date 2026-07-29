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
          <path d="M20.5 7.27783L12 12.0001M12 12.0001L3.49997 7.27783M12 12.0001L12 21.5001M14 20.889L12.777 21.5684C12.4934 21.726 12.3516 21.8047 12.2015 21.8356C12.0685 21.863 11.9315 21.863 11.7986 21.8356C11.6484 21.8047 11.5066 21.726 11.223 21.5684L3.82297 17.4573C3.52346 17.2909 3.37368 17.2077 3.26463 17.0893C3.16816 16.9847 3.09515 16.8606 3.05048 16.7254C3 16.5726 3 16.4013 3 16.0586V7.94153C3 7.59889 3 7.42757 3.05048 7.27477C3.09515 7.13959 3.16816 7.01551 3.26463 6.91082C3.37368 6.79248 3.52345 6.70928 3.82297 6.54288L11.223 2.43177C11.5066 2.27421 11.6484 2.19543 11.7986 2.16454C11.9315 2.13721 12.0685 2.13721 12.2015 2.16454C12.3516 2.19543 12.4934 2.27421 12.777 2.43177L20.177 6.54288C20.4766 6.70928 20.6263 6.79248 20.7354 6.91082C20.8318 7.01551 20.9049 7.13959 20.9495 7.27477C21 7.42757 21 7.59889 21 7.94153L21 12.5001M7.5 4.50008L16.5 9.50008M19 21.0001V15.0001M16 18.0001H22" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor">
          <path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" />
        </svg>
      );
    case 'customized':
      return (
        <svg viewBox="0 0 256 256" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M229.66,58.34l-32-32a8,8,0,0,0-11.32,0l-96,96A8,8,0,0,0,88,128v32a8,8,0,0,0,8,8h32a8,8,0,0,0,5.66-2.34l96-96A8,8,0,0,0,229.66,58.34ZM124.69,152H104V131.31l64-64L188.69,88ZM200,76.69,179.31,56,192,43.31,212.69,64ZM224,128v80a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h80a8,8,0,0,1,0,16H48V208H208V128a8,8,0,0,1,16,0Z" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v7.5m2.25-6.466a9.016 9.016 0 0 0-3.461-.203c-.536.072-.974.478-1.021 1.017a4.559 4.559 0 0 0-.018.402c0 .464.336.844.775.994l2.95 1.012c.44.15.775.53.775.994 0 .136-.006.27-.018.402-.047.539-.485.945-1.021 1.017a9.077 9.077 0 0 1-3.461-.203M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 8h-3" />
          <path d="m15 2-1 2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
          <path d="M16.899 22A5 5 0 0 0 7.1 22" />
          <path d="m9 2 3 6" />
          <circle cx="12" cy="15" r="3" />
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
