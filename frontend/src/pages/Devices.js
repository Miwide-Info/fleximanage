import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Card, Row, Col, Alert } from 'react-bootstrap';
import './Devices.css';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/devices?response=detailed', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched devices:', data);
      
      // Transform the API data to match our component structure
      const transformedDevices = data.map(device => ({
        id: device._id || device.id,
        name: device.name || 'Unknown Device',
        type: device.type || 'Router',
        hostname: device.hostname || 'N/A',
        wanIPs: device.interfaces?.filter(iface => iface.type === 'WAN')
          .map(iface => iface.IPv4 || iface.PublicIP)
          .filter(ip => ip)
          .join(', ') || 'N/A',
        status: device.isApproved ? 'Approved' : 'Pending',
        connection: device.isConnected ? 'Connected' : 'Not Connected',
        pps: device.stats?.pps || 'N/A',
        bps: device.stats?.bps || 'N/A',
        vRouter: device.sync?.state || device.deviceState || 'Pending',
        location: device.location || '',
        lastSeen: device.lastSeen || '',
        serial: device.serial || 'N/A',
        description: device.description || '',
        machineId: device.machineId || 'N/A'
      }));

      setDevices(transformedDevices);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setError(error.message || 'Failed to fetch devices');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Approved': 'success',
      'Pending': 'warning',
      'Rejected': 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getConnectionBadge = (connection) => {
    const variants = {
      'Connected': 'success',
      'Not Connected': 'danger',
      'Connecting': 'warning'
    };
    return <Badge bg={variants[connection] || 'secondary'}>{connection}</Badge>;
  };



  if (loading) {
    return <div className="text-center">Loading devices...</div>;
  }

  if (error) {
    return (
      <div className="devices-page">
        <div className="page-header">
          <h2>Devices</h2>
          <p className="text-muted">Manage your network devices</p>
        </div>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Devices</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDevices}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="devices-page">
      <div className="page-header">
        <div>
          <h2>Devices</h2>
          <p className="text-muted">Manage your network devices</p>
        </div>
      </div>

      <div className="mb-3">
        <h6 className="text-muted">Filter by device attributes</h6>
      </div>

      <Card>
        <Card.Body>
          {devices.length > 0 ? (
            <>
              {devices.map((device) => (
                <div key={device.id} className="device-card mb-4 p-3 border rounded">
                  <Row>
                    <Col md={6}>
                      <h5 className="mb-2">{device.name}</h5>
                      <div className="mb-2">
                        {getStatusBadge(device.status)}{' '}
                        {getConnectionBadge(device.connection)}
                      </div>
                      <div className="device-stats">
                        <div><strong>PPS:</strong> {device.pps}</div>
                        <div><strong>BPS:</strong> {device.bps}</div>
                        <div><strong>vRouter:</strong> <Badge bg="warning">{device.vRouter}</Badge></div>
                      </div>
                      {device.description && (
                        <div className="mt-2">
                          <small className="text-muted">{device.description}</small>
                        </div>
                      )}
                    </Col>
                    <Col md={6}>
                      <div className="device-details">
                        <div><strong>Hostname:</strong> {device.hostname}</div>
                        <div><strong>WAN IPs:</strong> {device.wanIPs}</div>
                        <div><strong>Serial:</strong> {device.serial}</div>
                        <div><strong>Machine ID:</strong> <small className="text-muted">{device.machineId}</small></div>
                        <div><strong>ID:</strong> <small className="text-muted">{device.id}</small></div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ))}
              
              <div className="mt-3">
                <small className="text-muted">{devices.length} device{devices.length !== 1 ? 's' : ''} in total</small>
              </div>
            </>
          ) : (
            <Alert variant="info" className="text-center">
              No devices found.
            </Alert>
          )}

          {devices.length === 0 && (
            <Alert variant="info" className="text-center">
              No devices found.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Devices;

