import React, { useState } from 'react';
import { BRAND_NAME } from '../constants/branding';
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
  FaChevronDown,
  FaUsers
} from 'react-icons/fa';
import { decodeJwtPayload, extractPerms, hasViewPermission } from '../auth/permissions';
import './Sidebar.css';

const Sidebar = ({ collapsed }) => {
  // Default: Account group collapsed
  const [openSections, setOpenSections] = useState({ account: false, inventory: false });

  // Get current user permissions
  const token = localStorage.getItem('token');
  const perms = token ? extractPerms(decodeJwtPayload(token)) : {};
  
  // Debug logging
  console.log('Sidebar rendering - Token exists:', !!token);
  console.log('Sidebar rendering - Permissions:', perms);
  console.log('Sidebar rendering - Has accesstokens permission:', hasViewPermission(perms, 'accesstokens'));

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const menuItems = [
    { type: 'item', path: '/home', icon: <FaHome />, label: 'Home' },
    {
      type: 'group',
      key: 'account',
      icon: <FaCog />,
      label: 'Account',
      children: [
        { path: '/account/profile', label: 'Profile' },
        { path: '/organizations', label: 'Organizations' },
        { path: '/account/notifications', label: 'Notifications Settings' },
        { path: '/account/billing', label: 'Billing' },
        { path: '/account/access-keys', label: 'Access Keys' },
      ]
    },
    { type: 'item', path: '/users', icon: <FaUsers />, label: 'Users' },
    {
      type: 'group',
      key: 'inventory',
      icon: <FaServer />, // reuse server icon; could swap for a different one later
      label: 'Inventory',
      children: [
        { path: '/devices', label: 'Devices' },
        { path: '/tokens', label: 'Tokens' }
      ]
    },
    { type: 'item', path: '/network', icon: <FaNetworkWired />, label: 'Network' },
    { type: 'item', path: '/tunnels', icon: <FaRoute />, label: 'Tunnels' },
    { type: 'item', path: '/firewall', icon: <FaShieldAlt />, label: 'Firewall' },
    { type: 'item', path: '/qos', icon: <FaTachometerAlt />, label: 'QoS' },
    { type: 'item', path: '/monitoring', icon: <FaTachometerAlt />, label: 'Monitoring' },
    { type: 'item', path: '/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
  <h3 className="brand">{BRAND_NAME}</h3>
      </div>
      <Nav className="flex-column sidebar-nav">
        {menuItems.map(item => {
          if (item.type === 'item') {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            );
          }
          if (item.type === 'group') {
            const isOpen = openSections[item.key];
            return (
              <div key={item.key} className={`nav-group ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                <button type="button" className="nav-link nav-group-toggle" onClick={() => toggleSection(item.key)}>
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-group-arrow" aria-hidden="true"><FaChevronDown /></span>
                    </>
                  )}
                </button>
                {isOpen && !collapsed && (
                  <div className="nav-submenu">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => `nav-sublink ${isActive ? 'active' : ''}`}
                      >
                        <span className="nav-sublabel">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </Nav>
    </div>
  );
};

export default Sidebar;