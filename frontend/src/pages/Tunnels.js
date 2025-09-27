import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Row, Col } from 'react-bootstrap';
import { FaRoute, FaPlay, FaStop, FaEye } from 'react-icons/fa';
import './Tunnels.css';

const Tunnels = () => {
  const [tunnels, setTunnels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTunnels();
  }, []);

  const fetchTunnels = async () => {
    try {
      // Mock data - replace with actual API call
      const mockTunnels = [
        {
          id: 'TUN001',
          name: 'HQ to Branch 1',
          type: 'IPsec',
          source: '192.168.1.1',
          destination: '10.0.0.1',
          status: 'up',
          bandwidth: '100 Mbps',
          uptime: '2d 4h 30m'
        },
        {
          id: 'TUN002',
          name: 'HQ to Branch 2',
          type: 'WireGuard',
          source: '192.168.1.1',
          destination: '172.16.0.1',
          status: 'up',
          bandwidth: '50 Mbps',
          uptime: '1d 12h 15m'
        },
        {
          id: 'TUN003',
          name: 'Branch 1 to Cloud',
          type: 'OpenVPN',
          source: '10.0.0.1',
          destination: '203.0.113.1',
          status: 'down',
          bandwidth: '25 Mbps',
          uptime: '0d 0h 0m'
        }
      ];
      setTunnels(mockTunnels);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tunnels:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      up: 'success',
      down: 'danger',
      warning: 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const handleToggleTunnel = (tunnelId, currentStatus) => {
    // Implement tunnel start/stop functionality
    console.log(`${currentStatus === 'up' ? 'Stop' : 'Start'} tunnel:`, tunnelId);
  };

  const handleViewTunnel = (tunnelId) => {
    // Implement view tunnel details functionality
    console.log('View tunnel:', tunnelId);
  };

  if (loading) {
    return <div className="text-center">Loading tunnels...</div>;
  }

  return (
    <div className="tunnels-page">
      <div className="page-header">
        <h2>Tunnel Management</h2>
        <p className="text-muted">Monitor and control your network tunnels</p>
      </div>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaRoute size={32} className="text-primary mb-2" />
              <h4>{tunnels.filter(t => t.status === 'up').length}</h4>
              <p className="text-muted mb-0">Active Tunnels</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaStop size={32} className="text-danger mb-2" />
              <h4>{tunnels.filter(t => t.status === 'down').length}</h4>
              <p className="text-muted mb-0">Inactive Tunnels</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaRoute size={32} className="text-info mb-2" />
              <h4>{tunnels.length}</h4>
              <p className="text-muted mb-0">Total Tunnels</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaRoute size={32} className="text-warning mb-2" />
              <h4>{tunnels.reduce((sum, t) => sum + parseInt(t.bandwidth), 0)} Mbps</h4>
              <p className="text-muted mb-0">Total Bandwidth</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Bandwidth</th>
                <th>Uptime</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((tunnel) => (
                <tr key={tunnel.id}>
                  <td>{tunnel.id}</td>
                  <td>{tunnel.name}</td>
                  <td>{tunnel.type}</td>
                  <td>{tunnel.source}</td>
                  <td>{tunnel.destination}</td>
                  <td>{getStatusBadge(tunnel.status)}</td>
                  <td>{tunnel.bandwidth}</td>
                  <td>{tunnel.uptime}</td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleViewTunnel(tunnel.id)}
                        title="View Details"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        variant={tunnel.status === 'up' ? 'outline-danger' : 'outline-success'}
                        size="sm"
                        onClick={() => handleToggleTunnel(tunnel.id, tunnel.status)}
                        title={tunnel.status === 'up' ? 'Stop Tunnel' : 'Start Tunnel'}
                      >
                        {tunnel.status === 'up' ? <FaStop /> : <FaPlay />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Tunnels;