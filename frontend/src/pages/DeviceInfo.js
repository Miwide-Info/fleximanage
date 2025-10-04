import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Alert, Spinner, Tab, Tabs, Form, Modal, Dropdown, Table } from 'react-bootstrap';
import { FaArrowLeft, FaServer, FaNetworkWired, FaChartLine, FaCog, FaSave, FaMicrochip, FaChevronDown, FaSync, FaSortUp, FaSortDown, FaPlay, FaStop, FaCheck, FaTimes } from 'react-icons/fa';
import './DeviceInfo.css';
import '../styles/unified-table.css';

const DeviceInfo = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Configuration submenu state
  const [configSubPage, setConfigSubPage] = useState('interfaces');
  
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
  
  // Interface editing state
  const [editingInterface, setEditingInterface] = useState(null);
  const [interfaceChanges, setInterfaceChanges] = useState({});
  const [syncingConfig, setSyncingConfig] = useState(false);

  // Sorting state for interfaces table
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  
  // Template interface changes state
  const [templateInterfaceChanges, setTemplateInterfaceChanges] = useState({});
  
  // DHCP server confirmation modal state
  const [showDhcpModal, setShowDhcpModal] = useState(false);
  const [dhcpModalInterface, setDhcpModalInterface] = useState(null);
  const [dhcpModalIP, setDhcpModalIP] = useState('');
  
  





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
      console.log('- Is approved:', deviceData?.isApproved);
      console.log('- Is synced:', deviceData?.isSynced);
      console.log('- Sync status:', deviceData?.syncStatus);
      console.log('- Is sync:', deviceData?.isSync);
      console.log('- Configuration synced:', deviceData?.configSynced);
      console.log('- Sync object:', deviceData?.sync);
      console.log('- Sync state:', deviceData?.sync?.state);
      console.log('- Last sync:', deviceData?.lastSync);
      console.log('- Connection status:', deviceData?.connectionStatus);
      console.log('- Last connection time:', deviceData?.lastConnection);
      console.log('- Device status:', deviceData?.status);
      console.log('- Device state:', deviceData?.state);
      console.log('- Device deviceState:', deviceData?.deviceState);

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

  // Initial fetch of device information
  useEffect(() => {
    // fetchDeviceInfo is stable (useCallback) so safe to add as dependency
    fetchDeviceInfo();
  }, [fetchDeviceInfo]);

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

  // Configuration page functions
  const getConfigPageTitle = (page) => {
    switch (page) {
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
            
            {device?.interfaces && device.interfaces.length > 0 ? (
              <>
                <Table striped bordered hover responsive className="unified-table interfaces-table">
                  <thead className="table-dark">
                    <tr>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={handleNameSort}
                        title="Click to sort by name"
                      >
                        Name 
                        {sortOrder === 'asc' ? (
                          <FaSortUp className="ms-1" />
                        ) : (
                          <FaSortDown className="ms-1" />
                        )}
                      </th>
                      <th>Type</th>
                      <th>Assigned</th>
                      <th>IPv4</th>
                      <th>GW</th>
                      <th>DNS Servers</th>
                      <th>Metric</th>
                      <th>Public IP</th>
                      <th>Path Labels</th>
                      <th>Routing</th>
                      <th>DHCP/Static</th>
                      <th>MAC</th>
                      <th>MTU</th>
                      <th>QoS</th>
                      <th>IPv6</th>
                      <th>Link Status</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedInterfaces(device.interfaces).map((iface, index) => (
                      <tr key={index}>
                        <td><strong>{iface.name || `eth${index}`}</strong></td>
                        <td>
                          <Badge bg={iface.type === 'WAN' ? 'primary' : iface.type === 'LAN' ? 'success' : 'secondary'}>
                            {iface.type || 'N/A'}
                          </Badge>
                        </td>
                        <td>
                          <Badge 
                            bg={
                              (interfaceChanges[iface._id]?.isAssigned !== undefined 
                                ? interfaceChanges[iface._id]?.isAssigned 
                                : iface.isAssigned) 
                              ? 'success' : 'secondary'
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleInterfaceEdit(
                              iface, 
                              'isAssigned', 
                              !(interfaceChanges[iface._id]?.isAssigned !== undefined 
                                ? interfaceChanges[iface._id]?.isAssigned 
                                : iface.isAssigned)
                            )}
                            title="Click to toggle assigned status"
                          >
                            {(interfaceChanges[iface._id]?.isAssigned !== undefined 
                              ? interfaceChanges[iface._id]?.isAssigned 
                              : iface.isAssigned) 
                              ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td>
                          {(interfaceChanges[iface._id]?.isAssigned !== undefined 
                            ? interfaceChanges[iface._id]?.isAssigned 
                            : iface.isAssigned) ? (
                            // Editable IPv4 when assigned
                            <div className="d-flex align-items-center">
                              <Form.Control
                                type="text"
                                size="sm"
                                style={{ width: '200px' }}
                                value={
                                  interfaceChanges[iface._id]?.IPv4 !== undefined 
                                    ? (interfaceChanges[iface._id]?.IPv4 + 
                                       (interfaceChanges[iface._id]?.IPv4Mask ? `/${interfaceChanges[iface._id]?.IPv4Mask}` : ''))
                                    : (iface.IPv4 ? `${iface.IPv4}${iface.IPv4Mask ? `/${iface.IPv4Mask}` : ''}` : '')
                                }
                                onChange={(e) => handleIPv4Edit(iface, e.target.value)}
                                placeholder="192.168.1.1/32"
                                title="Enter IPv4 address with subnet mask (e.g., 192.168.1.1/32)"
                                autoComplete="off"
                              />
                            </div>
                          ) : (
                            // Read-only IPv4 when not assigned
                            iface.IPv4 ? (
                              <code>{iface.IPv4}{iface.IPv4Mask ? `/${iface.IPv4Mask}` : ''}</code>
                            ) : (
                              <span className="text-muted">-</span>
                            )
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
                          {Array.isArray(iface.dnsServers) && iface.dnsServers.length > 0 ? (
                            <div style={{fontSize: '0.8rem', maxWidth: '120px'}}>
                              {iface.dnsServers.map((dns, i) => (
                                <div key={i} className="mb-1">
                                  <code>{dns}</code>
                                </div>
                              ))}
                            </div>
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
                          <Badge bg={
                            iface.linkStatus === 'up' || iface.linkStatus === 'Up' ? 'success' : 
                            iface.linkStatus === 'down' || iface.linkStatus === 'Down' || !iface.linkStatus ? 'danger' : 'secondary'
                          }>
                            {iface.linkStatus || 'Down'}
                          </Badge>
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
                        variant="info" 
                        size="sm" 
                        className="me-2"
                        disabled={Object.keys(interfaceChanges).length === 0 || syncingConfig}
                        onClick={syncDeviceConfig}
                      >
                        <FaSync className={`me-1 ${syncingConfig ? 'fa-spin' : ''}`} />
                        {syncingConfig ? 'Syncing...' : 'Sync'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Alert variant="info">
                <Alert.Heading>No Interface Data</Alert.Heading>
                <p>This device doesn't have interface data available.</p>
              </Alert>
            )}
          </div>
        );
      
      case 'firewall':
        return (
          <div>
            <h5><FaCog className="me-2" />Firewall and NAT Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>Firewall and NAT configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      case 'static-routes':
        return (
          <div>
            <h5><FaCog className="me-2" />Static Routes Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>Static routes configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      case 'ospf':
        return (
          <div>
            <h5><FaCog className="me-2" />OSPF Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>OSPF configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      case 'bgp':
        return (
          <div>
            <h5><FaCog className="me-2" />BGP Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>BGP configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      case 'routing-filters':
        return (
          <div>
            <h5><FaCog className="me-2" />Routing Filters Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>Routing filters configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      case 'advanced-routing':
        return (
          <div>
            <h5><FaCog className="me-2" />Advanced Routing Configuration</h5>
            <Alert variant="info">
              <Alert.Heading>Feature Coming Soon</Alert.Heading>
              <p>Advanced routing configuration will be available in a future update.</p>
            </Alert>
          </div>
        );
      
      default:
        return renderConfigurationContent('interfaces');
    }
  };

  // Sorting functions
  const handleNameSort = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  const getSortedInterfaces = (interfaces) => {
    if (!interfaces) return [];
    
    return [...interfaces].sort((a, b) => {
      const nameA = (a.name || `eth${interfaces.indexOf(a)}`).toLowerCase();
      const nameB = (b.name || `eth${interfaces.indexOf(b)}`).toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
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

  const handleIPv4Edit = (iface, value) => {
    // Allow more flexible input during typing
    // Parse IPv4 with optional mask (e.g., "192.168.1.1/32" or "192.168.1.1")
    // Support full range of subnet masks (0-32)
    const ipMaskRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\/(\d{1,2}))?$/;
    const match = value.match(ipMaskRegex);
    
    console.log('IPv4 input changed:', { interface: iface.name, value, match });
    
    if (match) {
      const [, ip, mask] = match;
      const updates = {
        IPv4: ip,
        // Only set mask if provided, don't auto-complete
        IPv4Mask: mask || ''
      };
      
      console.log('Parsed IPv4 data:', updates);
      
      setInterfaceChanges(prev => ({
        ...prev,
        [iface._id]: {
          ...prev[iface._id],
          ...updates
        }
      }));
      
      // Check if this is a LAN interface with assigned=yes and suitable for DHCP server
      // Show DHCP modal for LAN interfaces with valid subnet configurations
      const isAssigned = interfaceChanges[iface._id]?.isAssigned !== undefined 
        ? interfaceChanges[iface._id]?.isAssigned 
        : iface.isAssigned;
      const interfaceType = interfaceChanges[iface._id]?.type || iface.type || '';
      const currentDhcp = interfaceChanges[iface._id]?.dhcp || iface.dhcp || 'no';
      
      // Show DHCP modal for LAN interfaces that are assigned and have valid network ranges
      // This includes /24, /25, /26, /27, /28, /29, /30 subnet masks (but not /32 which is single host)
      if (mask && mask !== '32' && parseInt(mask) >= 8 && parseInt(mask) <= 30 && 
          isAssigned && 
          interfaceType.toLowerCase() === 'lan' && 
          currentDhcp !== 'yes') {
        console.log('Triggering DHCP modal for LAN interface with network range:', {
          interface: iface.name,
          ip: ip,
          mask: mask,
          assigned: isAssigned,
          type: interfaceType,
          currentDhcp: currentDhcp
        });
        
        // Show DHCP server confirmation modal
        setDhcpModalInterface(iface);
        setDhcpModalIP(`${ip}/${mask}`);
        setShowDhcpModal(true);
      }
    } else {
      // Allow partial input during typing (e.g., "192.168.", "192.168.1.1/")
      // Store the raw value to preserve user input
      setInterfaceChanges(prev => ({
        ...prev,
        [iface._id]: {
          ...prev[iface._id],
          IPv4: value,
          IPv4Mask: '' // Clear mask if input doesn't parse correctly
        }
      }));
    }
  };

  // Handle DHCP server confirmation
  const handleDhcpConfirmation = (enableDhcp) => {
    if (enableDhcp && dhcpModalInterface) {
      console.log('Enabling DHCP server for interface:', dhcpModalInterface.name);
      
      // Generate DHCP configuration automatically based on subnet
      const ip = dhcpModalIP.split('/')[0];
      const mask = dhcpModalIP.split('/')[1];
      const ipParts = ip.split('.');
      const networkBase = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      
      // Calculate appropriate DHCP range based on subnet mask
      let dhcpStartIP, dhcpEndIP;
      const maskInt = parseInt(mask);
      
      if (maskInt >= 24) {
        // /24, /25, /26, /27, /28, /29, /30 subnets
        const hostBits = 32 - maskInt;
        const totalHosts = Math.pow(2, hostBits) - 2; // Subtract network and broadcast
        
        if (totalHosts > 100) {
          // Large networks: use .100-.200 range
          dhcpStartIP = `${networkBase}.100`;
          dhcpEndIP = `${networkBase}.200`;
        } else if (totalHosts > 20) {
          // Medium networks: use second half of range
          const startHost = Math.floor(totalHosts / 2) + 1;
          const endHost = totalHosts;
          dhcpStartIP = `${networkBase}.${startHost}`;
          dhcpEndIP = `${networkBase}.${endHost}`;
        } else {
          // Small networks: use most of available range
          dhcpStartIP = `${networkBase}.2`;
          dhcpEndIP = `${networkBase}.${totalHosts}`;
        }
      } else {
        // Larger subnets (/16, /8, etc.)
        dhcpStartIP = `${networkBase}.100`;
        dhcpEndIP = `${networkBase}.200`;
      }
      
      // Auto-generate DHCP pool based on the IP address and subnet
      const dhcpConfig = {
        dhcp: 'yes',
        dhcpStartIP: dhcpStartIP,
        dhcpEndIP: dhcpEndIP,
        dhcpLeaseTime: '12h',
        dhcpDNS: '8.8.8.8,8.8.4.4'
      };
      
      console.log('Auto-generated DHCP configuration:', dhcpConfig);
      
      // Update interface changes with DHCP configuration
      setInterfaceChanges(prev => ({
        ...prev,
        [dhcpModalInterface._id]: {
          ...prev[dhcpModalInterface._id],
          ...dhcpConfig
        }
      }));
    }
    
    // Close the modal
    setShowDhcpModal(false);
    setDhcpModalInterface(null);
    setDhcpModalIP('');
  };

  const syncDeviceConfig = async () => {
    setSyncingConfig(true);
    setError(null);
    
    try {
      console.log('Starting device configuration sync...');

      // Prepare configuration data - include any pending changes or current config
      let configData = {
        action: 'sync-config',
        timestamp: new Date().toISOString()
      };

      // Include interface changes if any exist
      if (Object.keys(interfaceChanges).length > 0 && device?.interfaces) {
        const updatedInterfaces = device.interfaces.map(iface => ({
          ...iface,
          ...interfaceChanges[iface._id]
        }));
        configData.interfaces = updatedInterfaces;
        console.log('Including interface changes in sync:', interfaceChanges);
      } else {
        // If no changes, just trigger a general sync
        configData.forceSync = true;
      }

      console.log('Sending sync config data:', configData);

      const response = await apiCall(`/api/devices/${deviceId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'sync',
          entity: 'agent',
          message: 'sync-config',
          data: configData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed: ${response.status} - ${errorText}`);
      }

      console.log('Device configuration sync command sent successfully');
      
      // Update device sync status immediately
      setDevice(prevDevice => ({
        ...prevDevice,
        sync: {
          ...prevDevice?.sync,
          state: 'syncing'
        }
      }));
      
      // Show success message
      alert('Configuration sync initiated successfully!\n\nThe device is synchronizing its configuration. This may take a few moments.');
      
      // Clear interface changes if they were synced
      if (Object.keys(interfaceChanges).length > 0) {
        setInterfaceChanges({});
        setEditingInterface(null);
      }
      
      // Wait a moment then refresh device information
      setTimeout(() => {
        fetchDeviceInfo(true);
      }, 3000);

    } catch (error) {
      console.error('Configuration sync failed:', error);
      setError(error.message || 'Configuration sync failed');
      
      // Show error message
      alert(`Configuration sync failed: ${error.message}\n\nPlease try again or check the device connection.`);
    } finally {
      setSyncingConfig(false);
    }
  };

  const updateDevice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check what needs to be updated
      const hasBasicChanges = (deviceName !== (device?.name || '')) || 
                              (description !== (device?.description || ''));
      const hasInterfaceChanges = Object.keys(interfaceChanges).length > 0;
      const hasTemplateChanges = Object.keys(templateInterfaceChanges).length > 0;

      console.log('Update check:', {
        hasBasicChanges,
        hasInterfaceChanges,
        hasTemplateChanges,
        interfaceChanges,
        deviceName,
        description,
        currentDeviceName: device?.name,
        currentDescription: device?.description
      });

      // Prepare update data combining basic info and interface changes
      const shouldUpdateDevice = hasBasicChanges || hasInterfaceChanges;

      if (shouldUpdateDevice) {
        // Prepare the complete device data
        let deviceUpdateData = {
          name: deviceName,
          description: description
        };

        // Add interface data if there are interface changes
        if (hasInterfaceChanges && device?.interfaces) {
          const updatedInterfaces = device.interfaces.map(iface => {
            const changes = interfaceChanges[iface._id] || {};
            const updatedInterface = { ...iface, ...changes };
            
            console.log('Processing interface update:', {
              interfaceId: iface._id,
              interfaceName: iface.name,
              originalIPv4: iface.IPv4,
              originalMask: iface.IPv4Mask,
              changes: changes,
              updatedIPv4: updatedInterface.IPv4,
              updatedMask: updatedInterface.IPv4Mask
            });
            
            return updatedInterface;
          });
          deviceUpdateData.interfaces = updatedInterfaces;
          console.log('Including interface configurations in update:', interfaceChanges);
          console.log('Final interfaces data:', updatedInterfaces);
        }

        console.log('Sending device update data to API:', deviceUpdateData);

        const response = await apiCall(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(deviceUpdateData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API update failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`Device update failed: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Device updated successfully in database, response:', responseData);
      }

      // Handle template interface changes
      if (hasTemplateChanges) {
        console.log('Template interface changes saved:', templateInterfaceChanges);
      }

      // Show appropriate success message
      let message = 'Device updated successfully!';
      if (hasInterfaceChanges && !hasBasicChanges) {
        message = 'Interface configurations saved to database successfully!';
      } else if (hasInterfaceChanges && hasBasicChanges) {
        message = 'Device information and interface configurations saved to database successfully!';
      } else if (!hasInterfaceChanges && !hasBasicChanges && !hasTemplateChanges) {
        message = 'No changes detected.';
      }
      
      // Clear all changes only after successful update
      setInterfaceChanges({});
      setTemplateInterfaceChanges({});
      setEditingInterface(null);
      
      // Immediately refresh device information to show updated data
      await fetchDeviceInfo(true);
      
      alert(message);

    } catch (error) {
      console.error('Device update failed:', error);
      setError(error.message || 'Device update failed');
      
      // Don't clear changes if update failed, so user can retry
      // setInterfaceChanges({});
      // setTemplateInterfaceChanges({});
    } finally {
      setLoading(false);
    }
  };

  const startDevice = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting device vRouter functionality...');

      // First check if device is connected
      if (!device?.isConnected) {
        throw new Error('Device is not connected. Please ensure the device is online before starting vRouter.');
      }

      // Check if there are pending interface changes
      if (Object.keys(interfaceChanges).length > 0) {
        const confirmStart = window.confirm(
          'There are unsaved interface configuration changes. ' +
          'Do you want to update the device configuration first before starting vRouter?'
        );
        
        if (confirmStart) {
          // First update the device configuration
          await updateDevice();
          // Wait a moment for configuration to apply
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Prepare vRouter start command
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Start vRouter failed: ${response.status} - ${errorText}`);
      }

      console.log('vRouter start command sent successfully');
      
      // Immediately update local device state to reflect vRouter running and synced status
      setDevice(prevDevice => {
        const updatedDevice = {
          ...prevDevice,
          status: 'running',
          isSynced: true,
          configSynced: true,
          syncStatus: 'synced'
        };
        console.log('Updated device state after start:', updatedDevice);
        return updatedDevice;
      });
      
      // Show success message
      alert('vRouter start command sent successfully!\n\nThe device is now activating the vRouter functionality. This may take a few moments.');

      // Clear interface changes as they should now be applied
      setInterfaceChanges({});
      setTemplateInterfaceChanges({});

      // Refresh device information after a delay to see status updates
      setTimeout(() => {
        fetchDeviceInfo(true);
      }, 5000);

    } catch (error) {
      console.error('Start vRouter failed:', error);
      setError(error.message || 'Failed to start vRouter');
    } finally {
      setLoading(false);
    }
  };

  const stopDevice = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Stopping device vRouter functionality...');

      // First check if device is connected
      if (!device?.isConnected) {
        throw new Error('Device is not connected. Cannot communicate with offline device.');
      }

      // Confirm before stopping
      const confirmStop = window.confirm(
        'Are you sure you want to stop the vRouter functionality?\n\n' +
        'This will disable routing services on the device. ' +
        'The device will remain connected but routing functions will be stopped.'
      );
      
      if (!confirmStop) {
        return;
      }

      // Prepare vRouter stop command
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stop vRouter failed: ${response.status} - ${errorText}`);
      }

      console.log('vRouter stop command sent successfully');
      
      // Immediately update local device state to reflect vRouter stopped but still synced
      setDevice(prevDevice => {
        const updatedDevice = {
          ...prevDevice,
          status: 'stopped',
          isSynced: true,
          configSynced: true,
          syncStatus: 'synced'
        };
        console.log('Updated device state after stop:', updatedDevice);
        return updatedDevice;
      });
      
      // Show success message
      alert('vRouter stop command sent successfully!\n\nThe device is now deactivating the vRouter functionality. This may take a few moments.');

      // Refresh device information after a delay to see status updates
      setTimeout(() => {
        fetchDeviceInfo(true);
      }, 5000);

    } catch (error) {
      console.error('Stop vRouter failed:', error);
      setError(error.message || 'Failed to stop vRouter');
    } finally {
      setLoading(false);
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
        {/* Combined header line: Back button + Device info */}
        <div className="d-flex align-items-center mb-3 flex-wrap">
          <Button variant="outline-secondary" onClick={() => navigate('/devices')} className="me-3">
            <FaArrowLeft className="me-2" />
            Back to Devices
          </Button>
          
          <FaServer className="me-2 text-primary flex-shrink-0" style={{fontSize: '1.5rem'}} />
          <h2 className="mb-0 me-3 flex-shrink-0">{deviceName || device?.name || 'Unknown Device'}</h2>
          {(description || device?.description) && (
            <span className="text-muted" style={{fontStyle: 'italic'}}>
              {description || device?.description}
            </span>
          )}
        </div>
        
        {/* Update Device, Start Device, Stop Device, and Sync Device Config Buttons */}
        <div className="mb-3">
          <Button 
            variant="primary" 
            onClick={updateDevice}
            disabled={loading || (
              deviceName === (device?.name || '') &&
              description === (device?.description || '') &&
              Object.keys(interfaceChanges).length === 0 &&
              Object.keys(templateInterfaceChanges).length === 0
            )}
            className="me-2"
          >
            <FaSave className="me-2" />
            {loading ? 'Updating...' : 'Update Device'}
          </Button>
          
          <Button 
            variant="success" 
            onClick={startDevice}
            disabled={loading || !device?.isConnected || device?.state === 'running'}
            className="me-2"
            title={
              !device?.isConnected 
                ? 'Device must be connected to start vRouter' 
                : device?.state === 'running'
                ? 'vRouter is already running'
                : 'Start vRouter functionality'
            }
          >
            <FaPlay className="me-2" />
            {loading ? 'Starting...' : 'Start Device'}
          </Button>

          <Button 
            variant="warning" 
            onClick={stopDevice}
            disabled={loading || !device?.isConnected || device?.state !== 'running'}
            className="me-2"
            title={
              !device?.isConnected 
                ? 'Device must be connected to stop vRouter' 
                : device?.state !== 'running'
                ? 'vRouter is not running'
                : 'Stop vRouter functionality'
            }
          >
            <FaStop className="me-2" />
            {loading ? 'Stopping...' : 'Stop Device'}
          </Button>

          <Button 
            variant="info" 
            onClick={syncDeviceConfig}
            disabled={loading || !device?.isConnected || syncingConfig}
            className="me-2"
            title={
              !device?.isConnected 
                ? 'Device must be connected to sync configuration' 
                : syncingConfig
                ? 'Configuration sync in progress'
                : 'Synchronize device configuration'
            }
          >
            <FaSync className={`me-2 ${syncingConfig ? 'fa-spin' : ''}`} />
            {syncingConfig ? 'Syncing...' : 'Sync'}
          </Button>

          {/* Device Status Indicator */}
          <div className="d-inline-block me-2">
            <Badge bg={device?.isApproved ? 'success' : 'secondary'} className="me-1">
              {device?.isApproved ? 'Approved' : 'Not Approved'}
            </Badge>
            <Badge bg={device?.isConnected ? 'success' : 'secondary'} className="me-1">
              {device?.isConnected ? 'Connected' : 'Offline'}
            </Badge>
            <Badge 
              bg={
                device?.sync?.state === 'synced' || 
                device?.isSynced || 
                device?.configSynced || 
                device?.syncStatus === 'synced' 
                  ? 'success' 
                  : syncingConfig || device?.sync?.state === 'syncing'
                    ? 'warning' 
                    : 'secondary'
              } 
              className="me-1"
            >
              {device?.sync?.state === 'synced' || 
               device?.isSynced || 
               device?.configSynced || 
               device?.syncStatus === 'synced' 
                ? 'Synced' 
                : syncingConfig || device?.sync?.state === 'syncing'
                  ? 'Syncing...' 
                  : 'Not Synced'
              }
            </Badge>
            <Badge bg={device?.state === 'running' ? 'success' : 'danger'}>
              vRouter: {device?.state === 'running' ? 'Running' : 'Not Running'}
            </Badge>
          </div>
          
          {(Object.keys(interfaceChanges).length > 0 || 
            Object.keys(templateInterfaceChanges).length > 0 ||
            deviceName !== (device?.name || '') ||
            description !== (device?.description || '')) && (
            <small className="text-muted">
              Changes pending: {
                [
                  (deviceName !== (device?.name || '') || description !== (device?.description || '')) ? 'basic info' : null,
                  Object.keys(interfaceChanges).length > 0 ? `${Object.keys(interfaceChanges).length} interface(s)` : null,
                  Object.keys(templateInterfaceChanges).length > 0 ? `${Object.keys(templateInterfaceChanges).length} template interface(s)` : null
                ].filter(Boolean).join(', ')
              }
              {(Object.keys(interfaceChanges).length > 0 || Object.keys(templateInterfaceChanges).length > 0) && 
                ' (interface changes require separate sync)'}
            </small>
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
                    <Form.Label>
                      IPv4 Address
                      <small className="text-muted ms-2">(IP/Mask format)</small>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="192.168.1.1/24"
                      value={interfaceChanges[editingInterface._id]?.IPv4 || editingInterface.IPv4 || ''}
                      onChange={(e) => handleInterfaceEdit(editingInterface, 'IPv4', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Enter IPv4 address with subnet mask. For LAN interfaces with suitable subnet masks (/8-/30), 
                      DHCP server configuration will be offered automatically.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              
              {editingInterface?.type === 'LAN' && (
                <Alert variant="info" className="mt-3">
                  <h6><FaNetworkWired className="me-2" />LAN Interface Configuration</h6>
                  <p className="mb-2">
                    For LAN interfaces, you can configure IPv4 addresses with network ranges.
                    When you enter an IPv4 address with a suitable subnet mask (/8 to /30), 
                    the system will automatically offer to configure a DHCP server.
                  </p>
                  <div className="small text-muted">
                    <strong>Examples:</strong>
                    <ul className="mb-0">
                      <li><code>192.168.1.1/24</code> - Class C network (254 hosts)</li>
                      <li><code>10.0.0.1/16</code> - Class B network (65,534 hosts)</li>
                      <li><code>172.16.0.1/28</code> - Small network (14 hosts)</li>
                    </ul>
                  </div>
                </Alert>
              )}
              
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

      {/* DHCP Server Confirmation Modal */}
      <Modal 
        show={showDhcpModal} 
        onHide={() => handleDhcpConfirmation(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaNetworkWired className="me-2" />
            Enable DHCP Server
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-4">
              <FaNetworkWired size={48} className="mb-3 text-primary" />
              <h5>Enable DHCP server on the LAN interface</h5>
              <p className="mb-3">
                Do you want to automatically configure a DHCP server for this LAN interface?
              </p>
            </div>
            
            {dhcpModalInterface && (
              <div className="bg-light p-3 rounded mb-3">
                <div className="row text-start">
                  <div className="col-md-6">
                    <div><strong>Interface:</strong> {dhcpModalInterface.name}</div>
                    <div><strong>Type:</strong> {dhcpModalInterface.type}</div>
                    <div><strong>Network:</strong> {dhcpModalIP}</div>
                  </div>
                  <div className="col-md-6">
                    {(() => {
                      const ip = dhcpModalIP.split('/')[0];
                      const mask = dhcpModalIP.split('/')[1];
                      const maskInt = parseInt(mask);
                      const hostBits = 32 - maskInt;
                      const totalHosts = Math.pow(2, hostBits) - 2;
                      const ipParts = ip.split('.');
                      const networkBase = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
                      
                      let dhcpStart, dhcpEnd;
                      if (maskInt >= 24) {
                        if (totalHosts > 100) {
                          dhcpStart = `${networkBase}.100`;
                          dhcpEnd = `${networkBase}.200`;
                        } else if (totalHosts > 20) {
                          const startHost = Math.floor(totalHosts / 2) + 1;
                          dhcpStart = `${networkBase}.${startHost}`;
                          dhcpEnd = `${networkBase}.${totalHosts}`;
                        } else {
                          dhcpStart = `${networkBase}.2`;
                          dhcpEnd = `${networkBase}.${totalHosts}`;
                        }
                      } else {
                        dhcpStart = `${networkBase}.100`;
                        dhcpEnd = `${networkBase}.200`;
                      }
                      
                      return (
                        <>
                          <div><strong>Available Hosts:</strong> {totalHosts}</div>
                          <div><strong>DHCP Range:</strong> {dhcpStart} - {dhcpEnd}</div>
                          <div><strong>Lease Time:</strong> 12 hours</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-muted small">
              <p><strong>This will automatically configure:</strong></p>
              <div className="row text-start">
                <div className="col-md-6">
                  <ul>
                    <li>DHCP pool range based on network size</li>
                    <li>Lease time: 12 hours</li>
                    <li>DNS servers: 8.8.8.8, 8.8.4.4</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul>
                    <li>Gateway: Interface IP address</li>
                    <li>Subnet mask: From network configuration</li>
                    <li>Domain name: Local network</li>
                  </ul>
                </div>
              </div>
              <div className="alert alert-info mt-3">
                <small>
                  <strong>Note:</strong> DHCP server will only be enabled if the interface is assigned and configured as LAN type.
                  The DHCP range is calculated to avoid conflicts with the interface IP address.
                </small>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button 
            variant="secondary" 
            onClick={() => handleDhcpConfirmation(false)}
            className="me-3"
          >
            <FaTimes className="me-1" />
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleDhcpConfirmation(true)}
          >
            <FaCheck className="me-1" />
            Yes, Enable DHCP Server
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DeviceInfo;