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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h8l3.25 3.25V18A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" />
          <path d="M15 4.75V8h3.25" />
          <path d="M8.5 11h7" />
          <path d="M8.5 14.5h7" />
        </svg>
      );
    case 'customized':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">
          <path d="m77.954,33.365c-.004-.073-.023-.14-.043-.211-.017-.062-.03-.123-.058-.18-.028-.057-.068-.105-.106-.157-.043-.059-.085-.115-.139-.163-.016-.014-.023-.033-.04-.047-2.576-2.025-4.674-5.19-5.906-8.911-1.118-3.375-1.393-6.881-.775-9.871.008-.036-.003-.07,0-.106.004-.036.021-.067.021-.104,0-.035-.017-.065-.02-.1-.007-.071-.02-.137-.041-.205-.02-.064-.043-.122-.074-.18-.031-.059-.068-.111-.11-.163-.042-.052-.086-.098-.138-.141-.05-.042-.103-.076-.161-.108-.062-.034-.124-.061-.192-.082-.033-.01-.059-.033-.093-.04-.036-.008-.071.003-.107,0-.036-.004-.067-.021-.104-.021h-3.062c-.032.003-.064-.005-.095,0h-6.816c-.574,0-1.039.466-1.039,1.04,0,4.986-3.973,9.042-8.857,9.042s-8.857-4.056-8.857-9.042c0-.287-.116-.547-.304-.735-.188-.188-.448-.305-.735-.305h-10.291c-.038,0-.069.018-.106.021-.037.004-.071-.007-.108,0-.034.007-.059.029-.091.039-.068.021-.131.048-.192.083-.058.032-.111.066-.161.108-.051.043-.095.089-.137.141-.042.052-.078.104-.11.163-.031.058-.053.117-.073.18-.021.067-.034.133-.041.205-.003.034-.02.063-.02.098,0,.038.018.07.021.106.004.037-.007.071,0,.108.631,3.001.36,6.523-.765,9.918-1.181,3.565-3.178,6.648-5.621,8.68-.013.01-.018.026-.03.037-.055.05-.094.11-.137.17-.036.051-.078.098-.104.154-.026.056-.036.117-.052.178-.019.072-.04.141-.043.215,0,.016-.009.03-.009.046v53.162c0,.574.465,1.04,1.039,1.04h53.853c.574,0,1.039-.466,1.039-1.04v-52.964c0-.021-.011-.039-.012-.06Zm-10.939-7.095c1.001,2.633,2.418,5.084,4.144,7.205H28.621c1.776-2.071,3.265-4.437,4.309-6.955,1.658-3.999,2.176-8.157,1.513-11.865h1.215c.532,7.586,6.795,13.598,14.437,13.598s13.906-6.012,14.438-13.598h1.101c-.579,3.634-.106,7.703,1.381,11.616Zm5.446,22.691H27.94v-13.407h44.52v13.407Zm-44.52,2.08h44.52v34.307H27.94v-34.307Zm22.06-26.305c5.685,0,10.366-4.436,10.884-10.082h1.569c-.525,6.439-5.862,11.518-12.359,11.518s-11.833-5.079-12.359-11.518h1.38c.518,5.646,5.199,10.082,10.884,10.082Zm-25.887,8.95c2.564-2.271,4.65-5.54,5.891-9.286,1.087-3.281,1.445-6.692,1.039-9.746h1.276c.7,3.407.253,7.299-1.31,11.068-1.134,2.734-2.813,5.299-4.856,7.417-.033.034-.046.078-.074.115-.052.07-.107.137-.14.219-.033.083-.041.169-.052.256-.006.045-.027.085-.027.132v51.486h-1.749v-51.661Zm50.427,51.661v-50.833c0-.308-.139-.577-.351-.767-2.237-2.261-4.045-5.1-5.231-8.217-1.406-3.697-1.818-7.52-1.209-10.877h.895c-.395,3.041-.035,6.434,1.046,9.696,1.296,3.911,3.491,7.273,6.198,9.55v51.447h-1.348Zm-12.438-37.989c.115.066.243.1.371.1s.256-.033.371-.1l4.293-2.48c.23-.133.371-.378.371-.643v-4.959c0-.265-.141-.511-.371-.643l-4.293-2.48c-.23-.133-.513-.133-.742,0l-4.293,2.48c-.23.133-.371.378-.371.643v4.959c0,.265.141.51.371.643l4.293,2.48Zm-3.179-7.653l3.551-2.051,3.551,2.051v4.102l-3.551,2.051-3.551-2.051v-4.102Zm3.736,5.157l2.41-1.392c.115-.066.186-.189.186-.322v-2.784c0-.133-.071-.255-.186-.322l-2.41-1.392c-.115-.066-.256-.066-.371,0l-2.41,1.392c-.115.066-.186.189-.186.322v2.784c0,.133.071.255.186.322l2.41,1.392c.057.033.122.05.186.05s.128-.017.186-.05Zm-2.224-1.928v-2.355l2.039-1.178,2.039,1.178v2.355l-2.039,1.178-2.039-1.178Z" />
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
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 3.75h8.25L18.75 7.75V20.25A1.5 1.5 0 0 1 17.25 21.75H6.75A1.5 1.5 0 0 1 5.25 20.25V5.25A1.5 1.5 0 0 1 6.5 3.75Z" />
          <path d="M14.75 3.75V7.75H18.75" />
          <path d="M8 11.25h7.5" />
          <path d="M8 14.75h7.5" />
          <path d="M8 18.25h4.5" />
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
