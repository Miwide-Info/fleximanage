import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import Register from './pages/Register';
import './styles/App.css';
import './styles/layout.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // legacy state retained in case of future re-enable
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // If user was on /login (or any non-app path), send them to /home
    // Navigation also handled inside Login component, this is a safety net.
    setTimeout(() => {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/home', { replace: true });
      }
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  // Sidebar toggle removed from header; keeping state & logic placeholder if reintroduced later.
  // const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  if (!isAuthenticated) {
    // Unauthenticated routes (login & register). We still allow deep linking.
    if (location.pathname === '/register') {
      return <Register />;
    }
    // Normalize any other unauth path to the login component (supports /login explicitly)
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app app-root">
  <Header onLogout={handleLogout} />
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