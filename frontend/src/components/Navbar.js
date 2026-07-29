import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const UserAvatarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
    <path d="M5.75 19.25a6.25 6.25 0 0 1 12.5 0" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 7h15" />
    <path d="M4.5 12h15" />
    <path d="M4.5 17h15" />
  </svg>
);

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const userLabel = (user?.username || user?.email || 'User').trim() || 'User';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setDropdownOpen(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle navigation menu">
            <MenuIcon />
          </button>
          <img
            className="navbar-logo"
            src="/verdida-logo.png"
            alt="Verdida Sports Apparel logo"
          />
          <div className="navbar-brand">
            <h1 className="navbar-title">Verdida Sports Apparel</h1>
            <span className="navbar-tagline">Operations dashboard</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-menu">
            <button
              className="user-btn"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              <span className="user-avatar" aria-hidden="true">
                <UserAvatarIcon />
              </span>
              <span className="user-name">{userLabel}</span>
              <span className="user-caret" aria-hidden="true">
                v
              </span>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu" role="menu">
                <div className="dropdown-item">
                  <strong>{user?.email}</strong>
                </div>
                <div className="dropdown-item">Role: {user?.role}</div>
                <hr />
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
