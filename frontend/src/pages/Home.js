import React, { useState, useEffect } from 'react';
import { BRAND_NAME } from '../constants/branding';
import { Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { FaServer, FaNetworkWired, FaRoute, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState({
    devices: 0,
    tunnels: 0,
    networks: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch dashboard stats
    fetchStats();
    fetchRecentAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to handle API calls with authentication
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }

    // Ensure URL starts with /api for proper proxying
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;

    const response = await fetch(apiUrl, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
      return null;
    }

    return response;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard statistics...');
      
      const response = await apiCall('/api/dashboard/stats', {
        method: 'GET'
      });

      if (!response) {
        // Authentication failed, redirect already handled
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard stats received:', data);
      
      // Update stats with real data from backend
      setStats({
        devices: data.summary?.devices || 0,
        tunnels: data.summary?.tunnels || 0,
        networks: data.summary?.networks || 0,
        alerts: data.summary?.alerts || 0
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || 'Failed to fetch dashboard statistics');
      
      // Set fallback mock data in case of error
      setStats({
        devices: 0,
        tunnels: 0,
        networks: 0,
        alerts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      console.log('Fetching recent alerts...');
      
      const response = await apiCall('/api/dashboard/alerts?limit=5', {
        method: 'GET'
      });

      if (!response) {
        // Authentication failed, redirect already handled
        return;
      }

      if (!response.ok) {
        console.warn('Failed to fetch alerts:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Recent alerts received:', data);
      
      // Transform alerts data for display
      const transformedAlerts = data.map(alert => ({
        id: alert.id,
        type: alert.type || 'info',
        message: alert.message || 'System notification',
        timestamp: new Date(alert.timestamp).toLocaleString() || 'Unknown time'
      }));
      
      setRecentAlerts(transformedAlerts);
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      // Keep empty alerts array on error
      setRecentAlerts([]);
    }
  };

  const statCards = [
    {
      title: 'Devices',
      value: stats.devices,
      icon: <FaServer />,
      color: 'primary'
    },
    {
      title: 'Tunnels',
      value: stats.tunnels,
      icon: <FaRoute />,
      color: 'success'
    },
    {
      title: 'Networks',
      value: stats.networks,
      icon: <FaNetworkWired />,
      color: 'info'
    },
    {
      title: 'Active Alerts',
      value: stats.alerts,
      icon: <FaExclamationTriangle />,
      color: 'warning'
    }
  ];

  return (
    <div className="home-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="text-muted">Welcome to {BRAND_NAME}</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <strong>Error loading dashboard data:</strong> {error}
          <br />
          <small>Please try refreshing the page or check your connection.</small>
        </Alert>
      )}

      <Row className="stats-row">
        {statCards.map((card, index) => (
          <Col key={index} md={3} className="mb-4">
            <Card className={`stat-card bg-${card.color} text-white`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    {loading ? (
                      <Spinner animation="border" size="sm" className="mb-2" />
                    ) : (
                      <h3 className="mb-0">{card.value}</h3>
                    )}
                    <p className="mb-0">{card.title}</p>
                  </div>
                  <div className="stat-icon">
                    {card.icon}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5>System Overview</h5>
            </Card.Header>
            <Card.Body>
              <div className="system-status">
                <div className="status-item">
                  <span className="status-label">MongoDB:</span>
                  <span className="status-value text-success">Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Redis:</span>
                  <span className="status-value text-success">Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-label">WebSocket:</span>
                  <span className="status-value text-success">Active</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header>
              <h5>Recent Alerts</h5>
            </Card.Header>
            <Card.Body className="alerts-container">
              {recentAlerts.length === 0 ? (
                <p className="text-muted">No recent alerts</p>
              ) : (
                recentAlerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    variant={alert.type === 'error' ? 'danger' : 'warning'}
                    className="mb-2"
                  >
                    <small>
                      <strong>{alert.message}</strong><br />
                      {alert.timestamp}
                    </small>
                  </Alert>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;