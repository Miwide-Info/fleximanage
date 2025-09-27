import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Card, Row, Col, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import './Devices.css';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      // Mock data - replace with actual API call
      const mockDevices = [
        {
          id: 'FW001',
          name: 'Branch Office Router',
          type: 'Router',
          ip: '192.168.1.1',
          status: 'online',
          location: 'New York',
          lastSeen: '2025-09-26 14:30:00'
        },
        {
          id: 'FW002',
          name: 'Headquarter Gateway',
          type: 'Gateway',
          ip: '10.0.0.1',
          status: 'online',
          location: 'California',
          lastSeen: '2025-09-26 14:25:00'
        },
        {
          id: 'FW003',
          name: 'Remote Site Router',
          type: 'Router',
          ip: '172.16.1.1',
          status: 'offline',
          location: 'Texas',
          lastSeen: '2025-09-26 12:00:00'
        }
      ];
      setDevices(mockDevices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      online: 'success',
      offline: 'danger',
      warning: 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleAddDevice = () => {
    // Implement add device functionality
    console.log('Add device clicked');
  };

  const handleEditDevice = (deviceId) => {
    // Implement edit device functionality
    console.log('Edit device:', deviceId);
  };

  const handleDeleteDevice = (deviceId) => {
    // Implement delete device functionality
    console.log('Delete device:', deviceId);
  };

  const handleViewDevice = (deviceId) => {
    // Implement view device details functionality
    console.log('View device:', deviceId);
  };

  if (loading) {
    return <div className="text-center">Loading devices...</div>;
  }

  return (
    <div className="devices-page">
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2>Devices</h2>
            <p className="text-muted">Manage your network devices</p>
          </div>
          <Button variant="primary" onClick={handleAddDevice}>
            <FaPlus className="me-2" />
            Add Device
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Location</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.id}</td>
                  <td>{device.name}</td>
                  <td>{device.type}</td>
                  <td>{device.ip}</td>
                  <td>{getStatusBadge(device.status)}</td>
                  <td>{device.location}</td>
                  <td>{device.lastSeen}</td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleViewDevice(device.id)}
                        title="View"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEditDevice(device.id)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteDevice(device.id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {devices.length === 0 && (
            <Alert variant="info" className="text-center">
              No devices found. Click "Add Device" to get started.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Devices;