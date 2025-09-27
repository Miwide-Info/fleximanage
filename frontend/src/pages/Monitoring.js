import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FaChartLine, FaServer, FaNetworkWired, FaExclamationTriangle } from 'react-icons/fa';

const Monitoring = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2><FaChartLine className="me-2" />Monitoring & Analytics</h2>
        <p className="text-muted">Monitor system performance and network analytics</p>
      </div>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaServer size={32} className="text-success mb-2" />
              <h4>98.5%</h4>
              <p className="text-muted mb-0">Uptime</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaNetworkWired size={32} className="text-info mb-2" />
              <h4>245 Mbps</h4>
              <p className="text-muted mb-0">Avg Bandwidth</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaExclamationTriangle size={32} className="text-warning mb-2" />
              <h4>3</h4>
              <p className="text-muted mb-0">Active Alerts</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaChartLine size={32} className="text-primary mb-2" />
              <h4>1.2M</h4>
              <p className="text-muted mb-0">Packets/min</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body className="text-center py-5">
          <FaChartLine size={64} className="text-muted mb-3" />
          <h4>Monitoring Dashboard</h4>
          <p className="text-muted">Real-time monitoring and analytics interface will be implemented here.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Monitoring;