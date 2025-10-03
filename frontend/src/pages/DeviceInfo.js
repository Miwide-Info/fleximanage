import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Alert, Spinner, Tab, Tabs, Form, Modal, Dropdown, Table } from 'react-bootstrap';
import { FaArrowLeft, FaServer, FaNetworkWired, FaChartLine, FaCog, FaSave, FaMicrochip, FaChevronDown, FaSync } from 'react-icons/fa';
import './DeviceInfo.css';

const DeviceInfo = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Editable fields state
  const [deviceName, setDeviceName] = useState('');
  const [description, setDescription] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [originalIsApproved, setOriginalIsApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Hardware configuration modal state
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [hwCpuCores, setHwCpuCores] = useState('');
  const [currentVRouterCores, setCurrentVRouterCores] = useState('');
  const [vRouterCores, setVRouterCores] = useState('');
  const [powerSaving, setPowerSaving] = useState(false);
  const [applyingConfig, setApplyingConfig] = useState(false);
  
  // Configuration submenu state
  const [configSubPage, setConfigSubPage] = useState('interfaces');
  
  // Interface editing state
  const [editingInterface, setEditingInterface] = useState(null);
  const [interfaceChanges, setInterfaceChanges] = useState({});
  const [syncingConfig, setSyncingConfig] = useState(false);

  





  const getConnectionBadge = (connection) => {
    const variants = {
      'Connected': 'success',
      'Not Connected': 'danger',
      'Connecting': 'warning'
    };
    return <Badge bg={variants[connection] || 'secondary'}>{connection}</Badge>;
  };

  const apiCall = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }

    const response = await fetch(url, {
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
  }, [navigate]);

  const fetchDeviceInfo = useCallback(async (forceRefresh = false) => {
    try {
      const url = `/api/devices/${deviceId}${forceRefresh ? '?refresh=' + Date.now() : ''}`;
      console.log('🔍 Fetching device info from:', url);

      const response = await apiCall(url, {
        method: 'GET',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });

      console.log('📡 API Response status:', response?.status);
      console.log('📡 API Response headers:', response?.headers);

      if (!response) {
        console.error('❌ No response received from API');
        setError('Failed to fetch device information');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully received API data:', data);

      // Handle array response - get the first device
      const deviceData = Array.isArray(data) ? data[0] : data;
      setDevice(deviceData);

      // Debug logging - Display real data received from device agent
      console.log('Raw API data:', data);
      console.log('Device data after processing:', deviceData);
      console.log('Device isApproved:', deviceData?.isApproved);
      console.log('Type of isApproved:', typeof deviceData?.isApproved);
      console.log('Device interfaces from agent:', deviceData?.interfaces);
      console.log('Interfaces count:', deviceData?.interfaces?.length || 0);

      // Device connection and registration status check
      console.log('Device connection status check:');
      console.log('- Device name:', deviceData?.name);
      console.log('- Machine ID:', deviceData?.machineId);
      console.log('- Is connected:', deviceData?.isConnected);
      console.log('- Connection status:', deviceData?.connectionStatus);
      console.log('- Last connection time:', deviceData?.lastConnection);
      console.log('- Device status:', deviceData?.status);

      // Check possible interface field names in device agent data
      console.log('Checking possible interface fields:');
      console.log('- interfaces:', deviceData?.interfaces);
      console.log('- networkInterfaces:', deviceData?.networkInterfaces);
      console.log('- deviceInterfaces:', deviceData?.deviceInterfaces);
      console.log('- ports:', deviceData?.ports);
      console.log('- nics:', deviceData?.nics);

      // Initialize editable fields
      setDeviceName(deviceData?.name || '');
      setDescription(deviceData?.description || '');
      // Ensure boolean conversion - handle string 'true'/'false', numbers, etc.
      const approvedStatus = Boolean(deviceData?.isApproved);
      setIsApproved(approvedStatus);
      setOriginalIsApproved(approvedStatus);

      // Initialize hardware configuration fields
      setHwCpuCores(deviceData?.cpuInfo?.cores || '4');
      setCurrentVRouterCores(deviceData?.vRouterCores || '1');
      setVRouterCores(deviceData?.vRouterCores || '1');
      setPowerSaving(Boolean(deviceData?.powerSaving));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching device info:', error);
      setError(error.message || 'Failed to fetch device information');
      setLoading(false);
    }
  }, [deviceId, apiCall]);

  // initial fetch and periodic refresh
  useEffect(() => {
    // fetchDeviceInfo is stable (useCallback) so safe to add as dependency
    fetchDeviceInfo();
  }, [fetchDeviceInfo]);

  // Auto refresh agent data - check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && device) {
        console.log('Auto refreshing device agent data...');
        fetchDeviceInfo(true);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [device, loading, fetchDeviceInfo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        name: deviceName,
        description: description
      };
      
      // Only include isApproved if it has actually changed
      if (isApproved !== originalIsApproved) {
        updateData.isApproved = Boolean(isApproved);
      }
      
      console.log('Saving device data:', updateData);
      console.log('isApproved value:', isApproved, 'type:', typeof isApproved);
      console.log('originalIsApproved:', originalIsApproved, 'changed:', isApproved !== originalIsApproved);

      const response = await apiCall(`/api/devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response) {
        setSaving(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not JSON, use the raw text or default message
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Refresh device info
      await fetchDeviceInfo();
      setSaving(false);
      
      // Show success message (you can add a toast notification here)
      console.log('Device updated successfully');
      
    } catch (error) {
      console.error('Error updating device:', error);
      setError(error.message || 'Failed to update device');
      setSaving(false);
    }
  };

  const handleApplyHardwareConfig = async () => {
    try {
      setApplyingConfig(true);
      
      const configData = {
        vRouterCores: parseInt(vRouterCores),
        powerSaving: powerSaving
      };

      console.log('Applying hardware configuration:', configData);

      const response = await apiCall(`/api/devices/${deviceId}/hardware`, {
        method: 'PUT',
        body: JSON.stringify(configData)
      });

      if (!response) {
        setApplyingConfig(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Refresh device info and close modal
      await fetchDeviceInfo();
      setApplyingConfig(false);
      setShowHardwareModal(false);
      
      console.log('Hardware configuration applied successfully');
      
    } catch (error) {
      console.error('Error applying hardware configuration:', error);
      setError(error.message || 'Failed to apply hardware configuration');
      setApplyingConfig(false);
    }
  };

  const handleCancelHardwareConfig = () => {
    // Reset values to current device values
    setVRouterCores(currentVRouterCores);
    setPowerSaving(Boolean(device?.powerSaving));
    setShowHardwareModal(false);
  };

  // Interface configuration functions
  const handleInterfaceDiagnostic = (iface) => {
    console.log('Running diagnostic for interface:', iface.name);
    // TODO: Implement interface diagnostic logic
  };

  const handleInterfaceEdit = (iface, field, value) => {
    setInterfaceChanges(prev => ({
      ...prev,
      [iface._id]: {
        ...prev[iface._id],
        [field]: value
      }
    }));
  };

  const syncDeviceConfig = async () => {
    if (Object.keys(interfaceChanges).length === 0) {
      alert('No configuration changes to sync');
      return;
    }

    setSyncingConfig(true);
    try {
      // Prepare interface configuration data
      const updatedInterfaces = device.interfaces.map(iface => ({
        ...iface,
        ...interfaceChanges[iface._id]
      }));

      const configData = {
        interfaces: updatedInterfaces,
        action: 'sync-interfaces',
        timestamp: new Date().toISOString()
      };

      const response = await apiCall(`/api/devices/${deviceId}/sync-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      console.log('Device configuration synced successfully, waiting for agent to apply configuration...');
      
      // Clear changes and refresh data
      setInterfaceChanges({});
      setEditingInterface(null);
      
      // Wait a moment then refresh device information
      setTimeout(() => {
        fetchDeviceInfo(true);
      }, 2000);

    } catch (error) {
      console.error('Configuration sync failed:', error);
      setError(error.message || 'Configuration sync failed');
    } finally {
      setSyncingConfig(false);
    }
  };

  const getConfigPageTitle = (subPage) => {
    switch (subPage) {
      case 'interfaces': return 'Interfaces';
      case 'firewall': return 'Firewall and NAT';
      case 'static-routes': return 'Static Routes';
      case 'ospf': return 'OSPF';
      case 'bgp': return 'BGP';
      case 'routing-filters': return 'Routing Filters';
      case 'advanced-routing': return 'Advanced Routing';
      default: return 'Interfaces';
    }
  };

  const renderConfigurationContent = () => {
    switch (configSubPage) {
      case 'interfaces':
        return (
          <div>
            <h5><FaNetworkWired className="me-2" />Interfaces Configuration</h5>
            
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <small className="text-muted">
                  Last updated: {device ? new Date().toLocaleString('en-US') : 'Not fetched'}
                </small>
              </div>
              <div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => fetchDeviceInfo(true)}
                  disabled={loading}
                >
                  <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh Agent Data'}
                </Button>
              </div>
            </div>
            
            {device?.interfaces && device.interfaces.length > 0 ? (
              <>
                <Table striped bordered hover responsive className="interfaces-table">
                  <thead className="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Assigned</th>
                      <th>IPv4</th>
                      <th>GW</th>
                      <th>Metric</th>
                      <th>Public IP</th>
                      <th>Path Labels</th>
                      <th>Routing</th>
                      <th>DHCP/Static</th>
                      <th>MAC</th>
                      <th>MTU</th>
                      <th>QoS</th>
                      <th>IPv6</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {device.interfaces.map((iface, index) => (
                      <tr key={index}>
                        <td><strong>{iface.name || `eth${index}`}</strong></td>
                        <td>
                          <Badge bg={iface.type === 'WAN' ? 'primary' : iface.type === 'LAN' ? 'success' : 'secondary'}>
                            {iface.type || 'N/A'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={iface.isAssigned ? 'success' : 'secondary'}>
                            {iface.isAssigned ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td>
                          {iface.IPv4 ? (
                            <code>{iface.IPv4}{iface.IPv4Mask ? `/${iface.IPv4Mask}` : ''}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.gateway ? (
                            <code>{iface.gateway}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.metric ? (
                            <Badge bg="warning" text="dark">{iface.metric}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.PublicIP ? (
                            <code>{iface.PublicIP}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {Array.isArray(iface.pathlabels) && iface.pathlabels.length > 0 ? (
                            <div style={{fontSize: '0.8rem'}}>
                              {iface.pathlabels.map((label, i) => (
                                <Badge key={i} bg="info" className="me-1 mb-1">{label}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <Badge bg={iface.routing === 'OSPF' ? 'warning' : iface.routing === 'BGP' ? 'info' : 'secondary'}>
                            {iface.routing || 'NONE'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={iface.dhcp === 'yes' ? 'primary' : 'secondary'}>
                            {iface.dhcp === 'yes' ? 'DHCP' : 'Static'}
                          </Badge>
                        </td>
                        <td><code>{iface.MAC || '-'}</code></td>
                        <td>
                          {iface.mtu ? (
                            <Badge bg="secondary">{iface.mtu}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.qosPolicy ? (
                            <Badge bg="primary">{iface.qosPolicy}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.IPv6 ? (
                            <code>{iface.IPv6}{iface.IPv6Mask ? `/${iface.IPv6Mask}` : ''}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.description ? (
                            <span>{iface.description}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1" 
                            title="Edit interface configuration"
                            onClick={() => setEditingInterface(iface)}
                          >
                            <FaCog />
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            title="Interface diagnostics"
                            onClick={() => handleInterfaceDiagnostic(iface)}
                          >
                            <FaNetworkWired />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <div className="mt-3">
                  <Alert variant="info" className="mb-2">
                    <strong>Interface Summary:</strong>
                    <ul className="mb-0 mt-2">
                      <li><strong>Total Interfaces:</strong> {device.interfaces.length}</li>
                      <li><strong>DHCP:</strong> {device.interfaces.filter(iface => iface.dhcp === 'yes').length}</li>
                      <li><strong>Static:</strong> {device.interfaces.filter(iface => iface.dhcp !== 'yes').length}</li>
                      <li><strong>Up:</strong> {device.interfaces.filter(iface => iface.linkStatus === 'up' || iface.linkStatus === 'Up').length}</li>
                      <li><strong>Down:</strong> {device.interfaces.filter(iface => iface.linkStatus === 'down' || iface.linkStatus === 'Down' || !iface.linkStatus).length}</li>
                    </ul>
                  </Alert>
                  
                  <div className="d-flex gap-2 interface-actions justify-content-between">
                    <div>
                      <small className="text-muted">
                        {Object.keys(interfaceChanges).length > 0 && 
                          `${Object.keys(interfaceChanges).length} interface configurations pending sync`
                        }
                      </small>
                    </div>
                    <div>
                      <Button 
                        variant="success" 
                        size="sm" 
                        className="me-2"
                        disabled={Object.keys(interfaceChanges).length === 0 || syncingConfig}
                        onClick={syncDeviceConfig}
                      >
                        <FaSync className={`me-1 ${syncingConfig ? 'fa-spin' : ''}`} />
                        {syncingConfig ? 'Syncing...' : 'Sync Device Config'}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => fetchDeviceInfo(true)}
                        disabled={loading}
                      >
                        <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                        Refresh Agent Data
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Alert variant="info" className="mb-3">
                  <Alert.Heading>No Live Interface Data</Alert.Heading>
                  <p>This device doesn't have live interface data available. Showing template configuration based on common device setup.</p>
                </Alert>
                
                <Table striped bordered hover responsive className="interfaces-table">
                  <thead className="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Assigned</th>
                      <th>IPv4</th>
                      <th>GW</th>
                      <th>Metric</th>
                      <th>Public IP</th>
                      <th>Path Labels</th>
                      <th>Routing</th>
                      <th>DHCP/Static</th>
                      <th>MAC</th>
                      <th>MTU</th>
                      <th>QoS</th>
                      <th>IPv6</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: 'eth0',
                        MAC: '00:1f:7a:40:01:80',
                        dhcp: 'no',
                        IPv4: '10.0.0.1',
                        IPv4Mask: '30',
                        gateway: '',
                        dnsServers: [],
                        metric: '',
                        linkStatus: 'Down'
                      },
                      {
                        name: 'eth1',
                        MAC: '00:1f:7a:40:01:81',
                        dhcp: 'yes',
                        IPv4: '10.248.5.7',
                        IPv4Mask: '24',
                        gateway: '10.248.5.1',
                        dnsServers: ['10.248.5.1'],
                        metric: '100',
                        linkStatus: 'Up'
                      },
                      {
                        name: 'eth2',
                        MAC: '00:1f:7a:40:01:82',
                        dhcp: 'no',
                        IPv4: '192.168.1.1',
                        IPv4Mask: '24',
                        gateway: '',
                        dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'],
                        metric: '',
                        linkStatus: 'Down'
                      },
                      {
                        name: 'eth3',
                        MAC: '00:1f:7a:40:01:83',
                        dhcp: 'no',
                        IPv4: '',
                        IPv4Mask: '',
                        gateway: '',
                        dnsServers: [],
                        metric: '',
                        linkStatus: 'Down'
                      }
                    ].map((iface, index) => (
                      <tr key={index}>
                        <td><strong>{iface.name}</strong></td>
                        <td>
                          <Badge bg={index === 1 ? 'primary' : 'success'}>
                            {index === 1 ? 'WAN' : 'LAN'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">
                            No
                          </Badge>
                        </td>
                        <td>
                          {iface.IPv4 ? (
                            <code>{iface.IPv4}{iface.IPv4Mask ? `/${iface.IPv4Mask}` : ''}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.gateway ? (
                            <code>{iface.gateway}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {iface.metric ? (
                            <Badge bg="warning" text="dark">{iface.metric}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className="text-muted">-</span>
                        </td>
                        <td>
                          <span className="text-muted">-</span>
                        </td>
                        <td>
                          <Badge bg="secondary">
                            NONE
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={iface.dhcp === 'yes' ? 'primary' : 'secondary'}>
                            {iface.dhcp === 'yes' ? 'DHCP' : 'Static'}
                          </Badge>
                        </td>
                        <td><code>{iface.MAC}</code></td>
                        <td>
                          <Badge bg="secondary">1500</Badge>
                        </td>
                        <td>
                          <span className="text-muted">-</span>
                        </td>
                        <td>
                          <span className="text-muted">-</span>
                        </td>
                        <td>
                          <span className="text-muted">-</span>
                        </td>
                        <td>
                          <Button variant="outline-primary" size="sm" className="me-1" title="Edit">
                            <FaCog />
                          </Button>
                          <Button variant="outline-danger" size="sm" title="Delete">
                            <FaNetworkWired />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <div className="mt-3">
                  <Alert variant="info" className="mb-2">
                    <strong>Template Interface Summary:</strong>
                    <ul className="mb-0 mt-2">
                      <li><strong>Total Interfaces:</strong> 4</li>
                      <li><strong>DHCP:</strong> 1</li>
                      <li><strong>Static:</strong> 3</li>
                      <li><strong>Up:</strong> 1</li>
                      <li><strong>Down:</strong> 3</li>
                    </ul>
                  </Alert>
                  
                  <div className="d-flex gap-2 interface-actions">
                    <Button variant="outline-warning" size="sm">
                      <FaCog className="me-1" />
                      Refresh Data
                    </Button>
                    <Button variant="outline-primary" size="sm">
                      <FaNetworkWired className="me-1" />
                      Manual Configuration
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 'firewall':
        return (
          <div>
            <h5><FaCog className="me-2" />Firewall and NAT Configuration</h5>
            <Alert variant="info">
              Firewall and NAT rules configuration will be displayed here.
            </Alert>
          </div>
        );
      case 'static-routes':
        return (
          <div>
            <h5><FaCog className="me-2" />Static Routes Configuration</h5>
            <Alert variant="info">
              Static routing configuration will be displayed here.
            </Alert>
          </div>
        );
      case 'ospf':
        return (
          <div>
            <h5><FaCog className="me-2" />OSPF Configuration</h5>
            <Alert variant="info">
              OSPF routing protocol configuration will be displayed here.
            </Alert>
          </div>
        );
      case 'bgp':
        return (
          <div>
            <h5><FaCog className="me-2" />BGP Configuration</h5>
            <Alert variant="info">
              BGP routing protocol configuration will be displayed here.
            </Alert>
          </div>
        );
      case 'routing-filters':
        return (
          <div>
            <h5><FaCog className="me-2" />Routing Filters Configuration</h5>
            <Alert variant="info">
              Routing filters configuration will be displayed here.
            </Alert>
          </div>
        );
      case 'advanced-routing':
        return (
          <div>
            <h5><FaCog className="me-2" />Advanced Routing Configuration</h5>
            <Alert variant="info">
              Advanced routing configuration will be displayed here.
            </Alert>
          </div>
        );
      default:
        return (
          <div>
            <h5><FaNetworkWired className="me-2" />Interfaces Configuration</h5>
            <Alert variant="info">
              Network interfaces configuration will be displayed here.
            </Alert>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="device-info-page">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading device information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="device-info-page">
        <Button variant="outline-secondary" onClick={() => navigate('/devices')} className="mb-3">
          <FaArrowLeft className="me-2" />
          Back to Devices
        </Button>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Device</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDeviceInfo}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="device-info-page">
        <Button variant="outline-secondary" onClick={() => navigate('/devices')} className="mb-3">
          <FaArrowLeft className="me-2" />
          Back to Devices
        </Button>
        <Alert variant="info">
          Device not found.
        </Alert>
      </div>
    );
  }

  return (
    <div className="device-info-page">
      {/* Header */}
      <div className="page-header mb-4">
        <Button variant="outline-secondary" onClick={() => navigate('/devices')} className="mb-3">
          <FaArrowLeft className="me-2" />
          Back to Devices
        </Button>
        
        {/* Device Info Header - Icon, Name, Description in one line */}
        <div className="d-flex align-items-center mb-3 flex-wrap">
          <FaServer className="me-2 text-primary flex-shrink-0" style={{fontSize: '1.5rem'}} />
          <h2 className="mb-0 me-3 flex-shrink-0">{deviceName || device?.name || 'Unknown Device'}</h2>
          {(description || device?.description) && (
            <span className="text-muted" style={{fontStyle: 'italic'}}>
              {description || device?.description}
            </span>
          )}
        </div>
        
        <Row className="align-items-center">
          <Col md={8}>
            <div className="device-badges">
              {getConnectionBadge(device?.isConnected)}
            </div>
          </Col>
          <Col md={4} className="text-end">
          </Col>
        </Row>
      </div>

      {/* Tab Navigation */}
      <style>
        {`
          .device-info-tabs.nav-tabs .nav-link {
            color: #495057 !important;
            background-color: transparent !important;
          }
          .device-info-tabs.nav-tabs .nav-link.active {
            color: #ffffff !important;
            background-color: #343a40 !important;
            border: 1px solid #343a40 !important;
            font-weight: 600 !important;
          }
          .device-info-tabs.nav-tabs .nav-link:hover:not(.active) {
            color: #495057 !important;
            background-color: #f8f9fa !important;
          }
        `}
      </style>
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4 device-info-tabs"
      >
        <Tab eventKey="general" title={<><FaServer className="me-1" />General</>}>
          
          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <FaServer className="me-2" />
                    General Device Information
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <FaSave className="me-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Card.Header>
                <Card.Body>
                  <Form>
                    {/* Editable Fields Section */}
                    <div className="editable-info-rows mb-4">
                      <Row className="mb-3">
                        <Col md={3}><strong>Device Name:</strong></Col>
                        <Col md={9}>
                          <Form.Control
                            type="text"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="Enter device name"
                            size="sm"
                          />
                        </Col>
                      </Row>
                      
                      <Row className="mb-3">
                        <Col md={3}><strong>Description:</strong></Col>
                        <Col md={9}>
                          <Form.Control
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter device description"
                            size="sm"
                          />
                        </Col>
                      </Row>
                      
                      <Row className="mb-3">
                        <Col md={3}><strong>Approved:</strong></Col>
                        <Col md={9}>
                          <Form.Check
                            type="switch"
                            id="approved-switch"
                            label={isApproved ? 'Approved' : 'Not Approved'}
                            checked={isApproved}
                            onChange={(e) => setIsApproved(e.target.checked)}
                            className="custom-switch"
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Read-only Display Fields */}
                    <hr />
                    <h6 className="mb-3 text-muted">System Information (Read-only)</h6>
                    
                    <div className="system-info-rows">
                      <Row className="mb-2">
                        <Col md={3}><strong>Host Name:</strong></Col>
                        <Col md={9}><code>{device?.hostname || 'flexiwan-router'}</code></Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>Hardware:</strong></Col>
                        <Col md={9}>CPU cores: {device?.cpuInfo?.cores || '4'}, vRouter cores: {device?.vRouterCores || '1'}, Power Saving: {device?.powerSaving ? 'On' : 'Off'}</Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>S/N:</strong></Col>
                        <Col md={9}><code>{device?.serial || 'System Serial Number'}</code></Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>Host OS:</strong></Col>
                        <Col md={9}>{device?.distro?.codename || 'focal'} ({device?.distro?.version || '20.04'})</Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>Machine ID:</strong></Col>
                        <Col md={9}><code className="text-muted">{device?.machineId || '35927C9A-A552-4939-9275-2CE5DB5D637B'}</code></Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>Device Version:</strong></Col>
                        <Col md={9}><Badge bg="info">{device?.versions?.device || device?.versions?.agent || '6.4.32'}</Badge></Col>
                      </Row>
                      
                      <Row className="mb-2">
                        <Col md={3}><strong>Router Status:</strong></Col>
                        <Col md={9}>
                          <Badge bg={isApproved ? 'success' : 'danger'}>
                            {isApproved ? 'Approved' : 'Not Approved'}
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Network Interfaces */}
          {device?.interfaces && device.interfaces.length > 0 && (
            <Card className="mb-4">
              <Card.Header>
                <FaNetworkWired className="me-2" />
                Network Interfaces
              </Card.Header>
              <Card.Body>
                <Row>
                  {device.interfaces.map((iface, index) => (
                    <Col md={6} key={index} className="mb-3">
                      <div className="interface-card p-3 border rounded">
                        <h6>{iface.name}</h6>
                        <div className="interface-details">
                          <div><strong>Type:</strong> <Badge bg={iface.type === 'WAN' ? 'primary' : 'secondary'}>{iface.type}</Badge></div>
                          <div><strong>IPv4:</strong> {iface.IPv4 || 'N/A'}</div>
                          {iface.IPv4Mask && <div><strong>Mask:</strong> /{iface.IPv4Mask}</div>}
                          {iface.gateway && <div><strong>Gateway:</strong> {iface.gateway}</div>}
                          {iface.PublicIP && <div><strong>Public IP:</strong> {iface.PublicIP}</div>}
                          <div><strong>Status:</strong> <Badge bg={iface.isAssigned ? 'success' : 'warning'}>{iface.isAssigned ? 'Assigned' : 'Unassigned'}</Badge></div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Hardware Configuration Button - Only shown on General tab */}
          <div className="text-center mt-4">
            <Button 
              variant="outline-primary" 
              size="lg"
              onClick={() => setShowHardwareModal(true)}
            >
              <FaMicrochip className="me-2" />
              Hardware Configuration
            </Button>
          </div>
        </Tab>

        <Tab eventKey="statistics" title={<><FaChartLine className="me-1" />Statistics</>}>
          <Card>
            <Card.Header>
              <FaChartLine className="me-2" />
              Device Statistics
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                Device statistics will be displayed here.
              </Alert>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="configuration" title={<><FaCog className="me-1" />Configuration</>}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <FaCog className="me-2" />
                Device Configuration
              </div>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  {getConfigPageTitle(configSubPage)}
                  <FaChevronDown className="ms-1" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setConfigSubPage('interfaces')}>
                    <FaNetworkWired className="me-2" />
                    Interfaces
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('firewall')}>
                    <FaCog className="me-2" />
                    Firewall and NAT
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('static-routes')}>
                    <FaCog className="me-2" />
                    Static Routes
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('ospf')}>
                    <FaCog className="me-2" />
                    OSPF
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('bgp')}>
                    <FaCog className="me-2" />
                    BGP
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('routing-filters')}>
                    <FaCog className="me-2" />
                    Routing Filters
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setConfigSubPage('advanced-routing')}>
                    <FaCog className="me-2" />
                    Advanced Routing
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body>
              {renderConfigurationContent()}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Hardware Configuration Modal */}
      <Modal show={showHardwareModal} onHide={handleCancelHardwareConfig} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaMicrochip className="me-2" />
            Hardware Configuration
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><strong>HW CPU cores:</strong></Form.Label>
              <Form.Control
                type="text"
                value={hwCpuCores}
                readOnly
                className="readonly-field"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Current vRouter cores:</strong></Form.Label>
              <Form.Control
                type="text"
                value={currentVRouterCores}
                readOnly
                className="readonly-field"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>vRouter cores:</strong></Form.Label>
              <Form.Control
                type="number"
                value={vRouterCores}
                onChange={(e) => setVRouterCores(e.target.value)}
                min="1"
                max={hwCpuCores}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Power Saving:</strong></Form.Label>
              <div className="mt-2">
                <Form.Check
                  type="switch"
                  id="power-saving-switch"
                  label={powerSaving ? 'Enabled' : 'Disabled'}
                  checked={powerSaving}
                  onChange={(e) => setPowerSaving(e.target.checked)}
                />
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleCancelHardwareConfig}
            disabled={applyingConfig}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleApplyHardwareConfig}
            disabled={applyingConfig}
          >
            {applyingConfig ? 'Applying...' : 'Apply Configuration'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Interface Edit Modal */}
      <Modal show={editingInterface !== null} onHide={() => setEditingInterface(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Interface Configuration - {editingInterface?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingInterface && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>DHCP Configuration</Form.Label>
                    <Form.Select 
                      value={interfaceChanges[editingInterface._id]?.dhcp || editingInterface.dhcp}
                      onChange={(e) => handleInterfaceEdit(editingInterface, 'dhcp', e.target.value)}
                    >
                      <option value="yes">DHCP</option>
                      <option value="no">Static</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>IPv4 Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="192.168.1.100"
                      value={interfaceChanges[editingInterface._id]?.IPv4 || editingInterface.IPv4 || ''}
                      onChange={(e) => handleInterfaceEdit(editingInterface, 'IPv4', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subnet Mask</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="24"
                      value={interfaceChanges[editingInterface._id]?.IPv4Mask || editingInterface.IPv4Mask || ''}
                      onChange={(e) => handleInterfaceEdit(editingInterface, 'IPv4Mask', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Gateway</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="192.168.1.1"
                      value={interfaceChanges[editingInterface._id]?.gateway || editingInterface.gateway || ''}
                      onChange={(e) => handleInterfaceEdit(editingInterface, 'gateway', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>DNS Servers (comma separated)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="8.8.8.8, 8.8.4.4"
                  value={(interfaceChanges[editingInterface._id]?.dnsServers || editingInterface.dnsServers || []).join(', ')}
                  onChange={(e) => {
                    const dnsArray = e.target.value.split(',').map(dns => dns.trim()).filter(dns => dns);
                    handleInterfaceEdit(editingInterface, 'dnsServers', dnsArray);
                  }}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Routing Weight (Metric)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="100"
                  value={interfaceChanges[editingInterface._id]?.metric || editingInterface.metric || ''}
                  onChange={(e) => handleInterfaceEdit(editingInterface, 'metric', e.target.value)}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingInterface(null)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setEditingInterface(null);
              // Configuration changes are saved to interfaceChanges state
            }}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DeviceInfo;