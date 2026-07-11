import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle navigation menu">
            ☰
          </button>
          <img
            className="navbar-logo"
            src="/verdida-logo.png"
            alt="Verdida Sports Apparel logo"
          />
          <div className="navbar-brand">
            <h1 className="navbar-title"><i>Verdida Sports Apparel</i></h1>
            <span className="navbar-tagline">Operations dashboard</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-menu">
            <button
              className="user-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user?.username} ▾
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
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
