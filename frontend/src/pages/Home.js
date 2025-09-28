import React, { useState, useEffect } from 'react';
import { BRAND_NAME } from '../constants/branding';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { FaServer, FaNetworkWired, FaRoute, FaExclamationTriangle } from 'react-icons/fa';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState({
    devices: 0,
    tunnels: 0,
    networks: 0,
    alerts: 0
  });

  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    // Fetch dashboard stats
    fetchStats();
    fetchRecentAlerts();
  }, []);

  const fetchStats = async () => {
    try {
      // Mock data - replace with actual API call
      setStats({
        devices: 12,
        tunnels: 8,
        networks: 3,
        alerts: 2
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      // Mock data - replace with actual API call
      setRecentAlerts([
        {
          id: 1,
          type: 'warning',
          message: 'Device FW001 connection unstable',
          timestamp: '2025-09-26 10:30:00'
        },
        {
          id: 2,
          type: 'error',
          message: 'Tunnel TUN001 down',
          timestamp: '2025-09-26 09:15:00'
        }
      ]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
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

      <Row className="stats-row">
        {statCards.map((card, index) => (
          <Col key={index} md={3} className="mb-4">
            <Card className={`stat-card bg-${card.color} text-white`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="mb-0">{card.value}</h3>
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