import React from 'react';
import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import {
  FaHome,
  FaServer,
  FaNetworkWired,
  FaRoute,
  FaShieldAlt,
  FaTachometerAlt,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ collapsed }) => {
  const menuItems = [
    { path: '/home', icon: <FaHome />, label: 'Home' },
    { path: '/devices', icon: <FaServer />, label: 'Devices' },
    { path: '/network', icon: <FaNetworkWired />, label: 'Network' },
    { path: '/tunnels', icon: <FaRoute />, label: 'Tunnels' },
    { path: '/firewall', icon: <FaShieldAlt />, label: 'Firewall' },
    { path: '/qos', icon: <FaTachometerAlt />, label: 'QoS' },
    { path: '/monitoring', icon: <FaTachometerAlt />, label: 'Monitoring' },
    { path: '/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h3 className="brand">FlexiManage</h3>
      </div>
      <Nav className="flex-column sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </Nav>
    </div>
  );
};

export default Sidebar;