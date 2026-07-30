import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const UserAvatarIcon = () => (
  <svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
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
