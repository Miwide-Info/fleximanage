import React, { useState, useEffect } from 'react';
import { Button, Badge, Card, Row, Col, Alert, Form, ButtonGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlay, FaStop, FaSync, FaTrash, FaServer } from 'react-icons/fa';
import './Devices.css';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevices();
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

  const fetchDevices = async () => {
    try {
      const response = await apiCall('/api/devices?response=detailed', {
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
      console.log('Fetched devices:', data);
      
      // Transform the API data to match our component structure
      const transformedDevices = data.map(device => {
        const transformed = {
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
          vRouter: device.state || device.sync?.state || device.deviceState || 'Unknown',
          location: device.location || '',
          lastSeen: device.lastSeen || '',
          serial: device.serial || 'N/A',
          description: device.description || '',
          machineId: device.machineId || 'N/A'
        };
        
        // Log device transformation for debugging
        console.log('📱 Device transformed:', {
          originalId: device._id,
          transformedId: transformed.id,
          name: transformed.name,
          machineId: transformed.machineId,
          vRouter: transformed.vRouter,
          originalState: device.state,
          originalStatus: device.status,
          originalSync: device.sync?.state
        });
        
        return transformed;
      });

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

  const getVRouterBadge = (vRouterStatus) => {
    const statusText = vRouterStatus === 'running' ? 'Running' : 
                      vRouterStatus === 'stopped' ? 'Not Running' :
                      vRouterStatus === 'synced' ? 'Synced' :
                      vRouterStatus === 'syncing' ? 'Syncing...' :
                      vRouterStatus === 'starting' ? 'Starting...' :
                      vRouterStatus === 'stopping' ? 'Stopping...' :
                      vRouterStatus || 'Unknown';
    
    const variants = {
      'running': 'success',
      'Running': 'success',
      'stopped': 'danger', 
      'Not Running': 'danger',
      'synced': 'info',
      'Synced': 'info',
      'syncing': 'warning',
      'Syncing...': 'warning',
      'starting': 'warning',
      'Starting...': 'warning',
      'stopping': 'warning',
      'Stopping...': 'warning',
      'pending': 'warning',
      'Pending': 'warning'
    };
    
    const bgColor = variants[vRouterStatus] || variants[statusText] || 'secondary';
    return <Badge bg={bgColor}>{statusText}</Badge>;
  };

  // Handle device selection
  const handleDeviceSelect = (deviceId, isSelected) => {
    const newSelection = new Set(selectedDevices);
    if (isSelected) {
      newSelection.add(deviceId);
    } else {
      newSelection.delete(deviceId);
    }
    setSelectedDevices(newSelection);
  };

  // Handle select all devices
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedDevices(new Set(devices.map(device => device.id)));
    } else {
      setSelectedDevices(new Set());
    }
  };

  // Device action handlers
  const handleStartDevice = async (deviceId) => {
    try {
      console.log('🚀 Starting device:', deviceId);
      
      // Find the device to get its details for logging
      const device = devices.find(d => d.id === deviceId);
      console.log('📍 Device details:', {
        id: deviceId,
        name: device?.name,
        machineId: device?.machineId,
        currentStatus: device?.vRouter
      });
      
      // Immediately update the UI to show starting status for this specific device
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === deviceId 
            ? { ...d, vRouter: 'starting' }
            : d
        )
      );
      
      // Prepare vRouter start command with proper parameters
      const startData = {
        method: 'start',
        entity: 'agent',
        message: 'start-router'
      };
      
      console.log('Sending vRouter start command:', startData);
      
      const response = await apiCall(`/api/devices/${deviceId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(startData)
      });
      
      if (response && response.ok) {
        console.log('✅ Device start command sent successfully for device:', deviceId);
        
        // Wait a moment then refresh to see the updated status
        setTimeout(() => {
          console.log('🔄 Refreshing device list after start...');
          fetchDevices();
        }, 2000);
      } else {
        const errorText = await response.text();
        throw new Error(`Start device failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error starting device:', error);
      
      // Restore the original status on error
      const originalDevice = devices.find(d => d.id === deviceId);
      if (originalDevice) {
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === deviceId 
              ? { ...d, vRouter: originalDevice.vRouter }
              : d
          )
        );
      }
    }
  };

  const handleStopDevice = async (deviceId) => {
    try {
      console.log('🛑 Stopping device:', deviceId);
      
      // Find the device to get its details for logging
      const device = devices.find(d => d.id === deviceId);
      console.log('📍 Device details:', {
        id: deviceId,
        name: device?.name,
        machineId: device?.machineId,
        currentStatus: device?.vRouter
      });
      
      // Immediately update the UI to show stopping status for this specific device
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === deviceId 
            ? { ...d, vRouter: 'stopping' }
            : d
        )
      );
      
      // Prepare vRouter stop command with proper parameters
      const stopData = {
        method: 'stop',
        entity: 'agent',
        message: 'stop-router'
      };
      
      console.log('Sending vRouter stop command:', stopData);
      
      const response = await apiCall(`/api/devices/${deviceId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stopData)
      });
      
      if (response && response.ok) {
        console.log('✅ Device stop command sent successfully for device:', deviceId);
        
        // Wait a moment then refresh to see the updated status
        setTimeout(() => {
          console.log('🔄 Refreshing device list after stop...');
          fetchDevices();
        }, 2000);
      } else {
        const errorText = await response.text();
        throw new Error(`Stop device failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error stopping device:', error);
      
      // Restore the original status on error
      const originalDevice = devices.find(d => d.id === deviceId);
      if (originalDevice) {
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === deviceId 
              ? { ...d, vRouter: originalDevice.vRouter }
              : d
          )
        );
      }
    }
  };

  const handleSyncDevice = async (deviceId) => {
    try {
      console.log('🔄 Starting sync for device:', deviceId);
      
      // Find the device to get its details for logging
      const device = devices.find(d => d.id === deviceId);
      console.log('📍 Device details:', {
        id: deviceId,
        name: device?.name,
        machineId: device?.machineId,
        vRouterStatus: device?.vRouter
      });
      
      // Immediately update the UI to show syncing status for this specific device
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === deviceId 
            ? { ...d, vRouter: 'syncing' }
            : d
        )
      );
      
      const response = await apiCall(`/api/devices/${deviceId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ method: 'sync' })
      });
      
      if (response && response.ok) {
        console.log('✅ Device sync command sent successfully for device:', deviceId);
        
        // Wait a moment then refresh to see the updated status
        setTimeout(() => {
          console.log('🔄 Refreshing device list...');
          fetchDevices();
        }, 2000);
      } else {
        console.error('❌ Sync request failed:', response?.status, response?.statusText);
        // Restore original status if sync failed
        const originalDevice = devices.find(d => d.id === deviceId);
        if (originalDevice) {
          setDevices(prevDevices => 
            prevDevices.map(d => 
              d.id === deviceId 
                ? { ...d, vRouter: originalDevice.vRouter }
                : d
            )
          );
        }
      }
    } catch (error) {
      console.error('❌ Error syncing device:', deviceId, error);
      // Restore original status if sync failed
      const originalDevice = devices.find(d => d.id === deviceId);
      if (originalDevice) {
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === deviceId 
              ? { ...d, vRouter: originalDevice.vRouter }
              : d
          )
        );
      }
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        const response = await apiCall(`/api/devices/${deviceId}`, {
          method: 'DELETE'
        });
        
        if (response && response.ok) {
          console.log('Device deleted');
          fetchDevices(); // Refresh device list
        }
      } catch (error) {
        console.error('Error deleting device:', error);
      }
    }
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

      {/* Bulk Actions Bar */}
      {selectedDevices.size > 0 && (
        <div className="bulk-actions-bar mb-3 p-3 bg-light border rounded">
          <Row className="align-items-center">
            <Col md={6}>
              <span className="fw-bold">{selectedDevices.size} device{selectedDevices.size !== 1 ? 's' : ''} selected</span>
            </Col>
            <Col md={6} className="text-end">
              <ButtonGroup>
                <Button variant="success" size="sm" onClick={() => Array.from(selectedDevices).forEach(handleStartDevice)}>
                  <FaPlay className="me-1" />Start
                </Button>
                <Button variant="danger" size="sm" onClick={() => Array.from(selectedDevices).forEach(handleStopDevice)}>
                  <FaStop className="me-1" />Stop
                </Button>
                <Button variant="info" size="sm" onClick={() => Array.from(selectedDevices).forEach(handleSyncDevice)}>
                  <FaSync className="me-1" />Sync
                </Button>
                <Button variant="danger" size="sm" onClick={() => Array.from(selectedDevices).forEach(handleDeleteDevice)}>
                  <FaTrash className="me-1" />Delete
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        </div>
      )}

      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col md={6}>
              <Form.Check
                type="checkbox"
                id="select-all"
                label="Select All Devices"
                checked={devices.length > 0 && selectedDevices.size === devices.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </Col>
            <Col md={6} className="text-end">
              <small className="text-muted">{devices.length} device{devices.length !== 1 ? 's' : ''} total</small>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {devices.length > 0 ? (
            <>
              {devices.map((device) => (
                <div key={device.id} className="device-card mb-4 p-3 border rounded">
                  <Row className="align-items-center">
                    <Col md={1}>
                      <Form.Check
                        type="checkbox"
                        id={`device-${device.id}`}
                        checked={selectedDevices.has(device.id)}
                        onChange={(e) => handleDeviceSelect(device.id, e.target.checked)}
                      />
                    </Col>
                    <Col md={4}>
                      <div className="d-flex align-items-center mb-2">
                        <FaServer className="me-2 text-primary" />
                        <Link to={`/devices/${device.id}`} className="text-decoration-none">
                          <h5 className="mb-0">{device.name}</h5>
                        </Link>
                      </div>
                      <div className="mb-2">
                        {getStatusBadge(device.status)}{' '}
                        {getConnectionBadge(device.connection)}
                      </div>
                      <div className="device-stats">
                        <div><strong>PPS:</strong> {device.pps}</div>
                        <div><strong>BPS:</strong> {device.bps}</div>
                        <div><strong>vRouter:</strong> {getVRouterBadge(device.vRouter)}</div>
                      </div>
                      {device.description && (
                        <div className="mt-2">
                          <small className="text-muted">{device.description}</small>
                        </div>
                      )}
                    </Col>
                    <Col md={4}>
                      <div className="device-details">
                        <div><strong>Hostname:</strong> {device.hostname}</div>
                        <div><strong>WAN IPs:</strong> {device.wanIPs}</div>
                        <div><strong>Serial:</strong> {device.serial}</div>
                        <div><strong>Machine ID:</strong> <small className="text-muted">{device.machineId}</small></div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="action-buttons">
                        <div className="d-flex gap-1 justify-content-end">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleStartDevice(device.id)}
                            disabled={device.connection !== 'Connected' || device.vRouter === 'starting' || device.vRouter === 'running'}
                            title="Start Device"
                            className="px-2"
                          >
                            <FaPlay className="me-1" />Start
                          </Button>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleStopDevice(device.id)}
                            disabled={device.connection !== 'Connected' || device.vRouter === 'stopping' || device.vRouter === 'stopped'}
                            title="Stop Device"
                            className="px-2"
                          >
                            <FaStop className="me-1" />Stop
                          </Button>
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => handleSyncDevice(device.id)}
                            title="Sync Device"
                            className="px-2"
                          >
                            <FaSync className="me-1" />Sync
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id)}
                            title="Delete Device"
                            className="px-2"
                          >
                            <FaTrash className="me-1" />Delete
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ))}
            </>
          ) : (
            <Alert variant="info" className="text-center">
              <FaServer size={48} className="mb-3 text-muted" />
              <h5>No devices found</h5>
              <p>Your devices will appear here once they are registered and approved.</p>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Devices;

