import React from 'react';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { FaBars, FaUser, FaSignOutAlt, FaBell, FaCog } from 'react-icons/fa';
import './Header.css';

const Header = ({ onToggleSidebar, onLogout }) => {
  const notificationCount = 13; // TODO: replace with real count from props/store
  const displayCount = notificationCount > 9 ? '9+' : notificationCount;

  return (
    <Navbar bg="white" className="header-navbar">
      <div className="d-flex align-items-center">
        <button
          className="btn btn-link sidebar-toggle"
          onClick={onToggleSidebar}
        >
          <FaBars />
        </button>
        <h4 className="mb-0 ms-3">FlexiManage Dashboard</h4>
      </div>

      <Nav className="ms-auto d-flex align-items-center">
        <div className="notifications me-3" aria-label={`Notifications: ${notificationCount}`}>
          <FaBell className="notification-icon" />
          <span className="notification-badge" role="status" aria-live="polite">{displayCount}</span>
        </div>

        <Dropdown align="end">
          <Dropdown.Toggle variant="link" className="user-dropdown">
            <FaUser className="me-2" />
            Admin
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