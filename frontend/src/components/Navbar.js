import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const userLabel = (user?.username || user?.email || 'User').trim() || 'User';
  const userInitial = userLabel.charAt(0).toUpperCase();

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
            Menu
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
              <span className="user-initial" aria-hidden="true">
                {userInitial}
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
