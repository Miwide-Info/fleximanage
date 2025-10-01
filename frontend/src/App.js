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
import AccountMembers from './pages/account/Members';
import Organizations from './pages/Organizations';
import AddOrganization from './pages/AddOrganization';
import EditOrganization from './pages/EditOrganization';
import Devices from './pages/Devices';
import Network from './pages/Network';
import Tunnels from './pages/Tunnels';
import Firewall from './pages/Firewall';
import QoS from './pages/QoS';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import Tokens from './pages/Tokens';
import Login from './pages/Login';
import VerifyAccount from './pages/VerifyAccount';
import { decodeJwtPayload, extractPerms, hasViewPermission } from './auth/permissions';
import Forbidden from './components/Forbidden';
import Register from './pages/Register';
import './styles/App.css';
import './styles/layout.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed] = useState(false); // legacy placeholder
  const [perms, setPerms] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      const payload = decodeJwtPayload(token);
      setPerms(extractPerms(payload));
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // Decode permissions after new token saved by Login component
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeJwtPayload(token);
      setPerms(extractPerms(payload));
    }
    // If user was on /login (or any non-app path), send them to /home
    setTimeout(() => {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/home', { replace: true });
      }
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setPerms({});
  };

  // Sidebar toggle removed from header; keeping state & logic placeholder if reintroduced later.
  // const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  if (!isAuthenticated) {
    // Unauthenticated routes (login, register, verify-account)
    if (location.pathname === '/register') return <Register />;
    if (location.pathname.startsWith('/verify-account')) return <VerifyAccount />;
    return <Login onLogin={handleLogin} />;
  }

  // Wrapper component for guarded routes
  const Guard = ({ permKey, element }) => {
    if (!permKey) return element; // no guard
    if (hasViewPermission(perms, permKey)) return element;
    return <Forbidden />;
  };

  return (
    <div className="app app-root">
      <Header onLogout={handleLogout} />
      <Sidebar collapsed={sidebarCollapsed} />
      <div className={`content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/account" element={<Guard permKey="accounts" element={<Account />} />} />
          <Route path="/account/profile" element={<Guard permKey="accounts" element={<AccountProfile />} />} />
            <Route path="/account/organizations" element={<Guard permKey="organizations" element={<AccountOrganizations />} />} />
          <Route path="/account/notifications" element={<Guard permKey="notifications" element={<AccountNotificationsSettings />} />} />
          <Route path="/account/billing" element={<Guard permKey="billing" element={<AccountBilling />} />} />
          { /* Users page guarded by dedicated 'members' permission */ }
          <Route path="/users" element={<Guard permKey="members" element={<AccountMembers />} />} />
          <Route path="/account/members" element={<Navigate to="/users" replace />} />
          <Route path="/account/access-keys" element={<Guard permKey="accesstokens" element={<AccountAccessKeys />} />} />
          <Route path="/organizations" element={<Guard permKey="organizations" element={<Organizations />} />} />
          <Route path="/organizations/add" element={<Guard permKey="organizations" element={<AddOrganization />} />} />
          <Route path="/organizations/edit/:id" element={<Guard permKey="organizations" element={<EditOrganization />} />} />
          <Route path="/devices" element={<Guard permKey="devices" element={<Devices />} />} />
          <Route path="/network" element={<Guard permKey="organizations" element={<Network />} />} />
          <Route path="/tunnels" element={<Guard permKey="tunnels" element={<Tunnels />} />} />
          <Route path="/firewall" element={<Guard permKey="firewallpolicies" element={<Firewall />} />} />
          <Route path="/qos" element={<Guard permKey="qospolicies" element={<QoS />} />} />
          <Route path="/monitoring" element={<Guard permKey="devices" element={<Monitoring />} />} />
          <Route path="/tokens" element={<Guard permKey="accesstokens" element={<Tokens />} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;