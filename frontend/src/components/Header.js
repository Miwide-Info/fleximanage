import React from 'react';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { FaUser, FaSignOutAlt, FaBell, FaCog, FaBars } from 'react-icons/fa';
import './Header.css';


const Header = ({ onLogout }) => {
  const notificationCount = 13; // TODO: replace with real count from props/store
  const displayCount = notificationCount > 9 ? '9+' : notificationCount;

  // 解析 token，获取用户名/email
  let userLabel = 'User';
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payloadB64 = token.split('.')[1];
      if (payloadB64) {
        const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodeURIComponent(escape(json)));
        userLabel = payload.email || payload.username || 'User';
      }
    }
  } catch (e) {}

  return (
    <Navbar bg="white" className="header-navbar">
      <div className="d-flex align-items-center">
        <span className="sidebar-toggle btn btn-link disabled" style={{ cursor: 'default' }}>
          <FaBars />
        </span>
        <h4 className="mb-0 ms-2">OpenSource-OpenNetworking</h4>
      </div>

      <Nav className="ms-auto d-flex align-items-center">
        <div className="notifications me-3" aria-label={`Notifications: ${notificationCount}`}>
          <FaBell className="notification-icon" />
          <span className="notification-badge" role="status" aria-live="polite">{displayCount}</span>
        </div>

        <Dropdown align="end">
          <Dropdown.Toggle variant="link" className="user-dropdown">
            <FaUser className="me-2" />
            {userLabel}
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item href="#profile">
              <FaUser className="me-2" />
              Profile
            </Dropdown.Item>
            <Dropdown.Item href="#settings">
              <FaCog className="me-2" />
              Settings
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={onLogout}>
              <FaSignOutAlt className="me-2" />
              Logout
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Nav>
    </Navbar>
  );
};

export default Header;