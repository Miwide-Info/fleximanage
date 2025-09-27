import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// import { Container } from 'react-bootstrap';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Account from './pages/Account';
import AccountProfile from './pages/account/Profile';
import AccountOrganizations from './pages/account/Organizations';
import AccountNotificationsSettings from './pages/account/NotificationsSettings';
import AccountBilling from './pages/account/Billing';
import AccountAccessKeys from './pages/account/AccessKeys';
import Devices from './pages/Devices';
import Network from './pages/Network';
import Tunnels from './pages/Tunnels';
import Firewall from './pages/Firewall';
import QoS from './pages/QoS';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import Login from './pages/Login';
import './styles/App.css';
import './styles/layout.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app app-root">
      <Header onToggleSidebar={toggleSidebar} onLogout={handleLogout} />
      <Sidebar collapsed={sidebarCollapsed} />
      <div className={`content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/profile" element={<AccountProfile />} />
          <Route path="/account/organizations" element={<AccountOrganizations />} />
          <Route path="/account/notifications" element={<AccountNotificationsSettings />} />
          <Route path="/account/billing" element={<AccountBilling />} />
          <Route path="/account/access-keys" element={<AccountAccessKeys />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/network" element={<Network />} />
          <Route path="/tunnels" element={<Tunnels />} />
          <Route path="/firewall" element={<Firewall />} />
          <Route path="/qos" element={<QoS />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;