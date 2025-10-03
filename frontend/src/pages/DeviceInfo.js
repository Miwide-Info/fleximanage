import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchDeviceInfo();
  }, [deviceId]);

  // 自动刷新agent数据 - 每30秒检查一次
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && device) {
        console.log('自动刷新设备agent数据...');
        fetchDeviceInfo(true);
      }
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [device, loading]);

  const fetchDeviceInfo = async (forceRefresh = false) => {
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
      
      // Debug logging - 显示从设备agent接收到的真实数据
      console.log('Raw API data:', data);
      console.log('Device data after processing:', deviceData);
      console.log('Device isApproved:', deviceData?.isApproved);
      console.log('Type of isApproved:', typeof deviceData?.isApproved);
      console.log('Device interfaces from agent:', deviceData?.interfaces);
      console.log('Interfaces count:', deviceData?.interfaces?.length || 0);
      
      // 设备连接和注册状态检查
      console.log('设备连接状态检查:');
      console.log('- 设备名称:', deviceData?.name);
      console.log('- 机器ID:', deviceData?.machineId);
      console.log('- 是否连接:', deviceData?.isConnected);
      console.log('- 连接状态:', deviceData?.connectionStatus);
      console.log('- 最后连接时间:', deviceData?.lastConnection);
      console.log('- 设备状态:', deviceData?.status);
      
      // 检查设备agent数据中可能的接口字段名
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
      setIsApproved(Boolean(deviceData?.isApproved));
      
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
  };

  const getStatusBadge = (approvedStatus) => {
    const variants = {
      'Approved': 'success',
      'Pending': 'warning',
      'Rejected': 'danger'
    };
    const statusText = approvedStatus ? 'Approved' : 'Pending';
    return <Badge bg={variants[statusText] || 'secondary'}>{statusText}</Badge>;
  };

  const getConnectionBadge = (connection) => {
    const variants = {
      'Connected': 'success',
      'Not Connected': 'danger',
      'Connecting': 'warning'
    };
    return <Badge bg={variants[connection] || 'secondary'}>{connection}</Badge>;
  };

  const apiCall = async (url, options = {}) => {
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
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        name: deviceName,
        description: description,
        isApproved: Boolean(isApproved)
      };
      
      console.log('Saving device data:', updateData);
      console.log('isApproved value:', isApproved, 'type:', typeof isApproved);

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
      alert('没有配置更改需要同步');
      return;
    }

    setSyncingConfig(true);
    try {
      // 准备接口配置数据
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

      console.log('设备配置同步成功，等待agent应用配置...');
      
      // 清除更改并刷新数据
      setInterfaceChanges({});
      setEditingInterface(null);
      
      // 等待一会后刷新设备信息
      setTimeout(() => {
        fetchDeviceInfo(true);
      }, 2000);

    } catch (error) {
      console.error('配置同步失败:', error);
      setError(error.message || '配置同步失败');
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
                  最后更新: {device ? new Date().toLocaleString('zh-CN') : '未获取'}
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
                  {loading ? '刷新中...' : '刷新Agent数据'}
                </Button>
              </div>
            </div>
            
            {device?.interfaces && device.interfaces.length > 0 ? (
              <>
                <Table striped bordered hover responsive className="interfaces-table">
                  <thead className="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>MAC</th>
                      <th>DHCP/Static</th>
                      <th>IPv4</th>
                      <th>GW</th>
                      <th>DNS Servers</th>
                      <th>Metric</th>
                      <th>Link Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {device.interfaces.map((iface, index) => (
                      <tr key={index}>
                        <td><strong>{iface.name || `eth${index}`}</strong></td>
                        <td><code>{iface.MAC || '-'}</code></td>
                        <td>
                          <Badge bg={iface.dhcp === 'yes' ? 'primary' : 'secondary'}>
                            {iface.dhcp === 'yes' ? 'DHCP' : 'Static'}
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
                          {Array.isArray(iface.dnsServers) && iface.dnsServers.length > 0 ? (
                            <div style={{fontSize: '0.8rem'}}>
                              {iface.dnsServers.map((dns, i) => (
                                <div key={i}>{dns}</div>
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
                          <Badge bg={
                            (iface.linkStatus === 'up' || iface.linkStatus === 'Up') ? 'success' : 
                            (iface.linkStatus === 'down' || iface.linkStatus === 'Down') ? 'danger' : 'secondary'
                          }>
                            {iface.linkStatus ? 
                              (iface.linkStatus.charAt(0).toUpperCase() + iface.linkStatus.slice(1).toLowerCase()) : 
                              '未知'
                            }
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1" 
                            title="编辑接口配置"
                            onClick={() => setEditingInterface(iface)}
                          >
                            <FaCog />
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            title="接口诊断"
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
                          `有 ${Object.keys(interfaceChanges).length} 个接口配置待同步`
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
                        {syncingConfig ? '同步中...' : 'Sync Device Config'}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => fetchDeviceInfo(true)}
                        disabled={loading}
                      >
                        <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                        刷新Agent数据
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
                      <th>MAC</th>
                      <th>DHCP/Static</th>
                      <th>IPv4</th>
                      <th>GW</th>
                      <th>DNS Servers</th>
                      <th>Metric</th>
                      <th>Link Status</th>
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
                        <td><code>{iface.MAC}</code></td>
                        <td>
                          <Badge bg={iface.dhcp === 'yes' ? 'primary' : 'secondary'}>
                            {iface.dhcp === 'yes' ? 'DHCP' : 'Static'}
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
                          {Array.isArray(iface.dnsServers) && iface.dnsServers.length > 0 ? (
                            <div style={{fontSize: '0.8rem'}}>
                              {iface.dnsServers.map((dns, i) => (
                                <div key={i}>{dns}</div>
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
                          <Badge bg={iface.linkStatus === 'Up' ? 'success' : 'secondary'}>
                            {iface.linkStatus}
                          </Badge>
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
        
        <Row className="align-items-center">
          <Col md={8}>
            <h2><FaServer className="me-2" />{deviceName || device?.name || 'Unknown Device'}</h2>
            <p className="text-muted mb-2">{description || device?.description || 'No description available'}</p>
            <div className="device-badges">
              {getStatusBadge(isApproved)}
              {' '}
              {getConnectionBadge(device?.isConnected)}
            </div>
          </Col>
          <Col md={4} className="text-end">
            <div className="device-id-info">
              <small className="text-muted">Device ID</small>
              <div className="font-monospace">{device?._id}</div>
            </div>
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
          
          {/* 设备连接状态检查 */}
          {device && !device.isConnected && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading>⚠️ 设备离线</Alert.Heading>
              <p>
                设备 <strong>{device.name}</strong> (ID: {device.machineId}) 当前未连接到 FlexiManage 服务器。
              </p>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" onClick={() => fetchDeviceInfo(true)}>
                  <FaSync className="me-1" />刷新状态
                </Button>
              </div>
            </Alert>
          )}
          
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
                  {/* Warning for unapproved devices */}
                  {!isApproved && (
                    <Alert variant="warning" className="mb-3">
                      <Alert.Heading>Device Not Approved</Alert.Heading>
                      This device must be approved before making changes. Please enable the "Approved" toggle switch below and save to approve this device first.
                    </Alert>
                  )}
                  
                  <Form>
                    {/* Editable Input Fields */}
                    <div className="mb-4">
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Device Name:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={deviceName}
                          onChange={(e) => setDeviceName(e.target.value)}
                          placeholder="Enter device name"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Description:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter device description"
                        />
                      </Form.Group>
                    </div>

                    {/* Toggle Switch */}
                    <div className="mb-4">
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Approved:</strong></Form.Label>
                        <div className="mt-2">
                          <Form.Check
                            type="switch"
                            id="approved-switch"
                            label={isApproved ? 'Approved' : 'Pending'}
                            checked={isApproved}
                            onChange={(e) => setIsApproved(e.target.checked)}
                            className="custom-switch"
                          />
                        </div>
                      </Form.Group>
                    </div>

                    {/* Read-only Display Fields */}
                    <hr />
                    <h6 className="mb-3 text-muted">System Information (Read-only)</h6>
                    
                    <div className="info-display-grid">
                      <div className="info-display-item">
                        <Form.Label><strong>Host Name:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={device?.hostname || 'flexiwan-router'}
                          readOnly
                          className="readonly-field"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>Hardware:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={`CPU cores: ${device?.cpuInfo?.cores || '4'}, vRouter cores: ${device?.vRouterCores || '1'}, Power Saving: ${device?.powerSaving ? 'On' : 'Off'}`}
                          readOnly
                          className="readonly-field"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>S/N:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={device?.serial || 'System Serial Number'}
                          readOnly
                          className="readonly-field"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>Host OS:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={`${device?.osInfo?.distro || 'focal'} (${device?.osInfo?.release || '20.04'})`}
                          readOnly
                          className="readonly-field"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>Machine ID:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={device?.machineId || '35927C9A-A552-4939-9275-2CE5DB5D637B'}
                          readOnly
                          className="readonly-field font-monospace"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>Device Version:</strong></Form.Label>
                        <Form.Control
                          type="text"
                          value={device?.versions?.device || device?.versions?.agent || '6.4.32'}
                          readOnly
                          className="readonly-field"
                        />
                      </div>
                      
                      <div className="info-display-item">
                        <Form.Label><strong>Router Status:</strong></Form.Label>
                        <div className="mt-2">
                          <Badge bg={isApproved ? 'success' : 'warning'} className="fs-6">
                            {isApproved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
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
          <Modal.Title>编辑接口配置 - {editingInterface?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingInterface && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>DHCP配置</Form.Label>
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
                    <Form.Label>IPv4地址</Form.Label>
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
                    <Form.Label>子网掩码</Form.Label>
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
                    <Form.Label>网关</Form.Label>
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
                <Form.Label>DNS服务器 (逗号分隔)</Form.Label>
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
                <Form.Label>路由权重 (Metric)</Form.Label>
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
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setEditingInterface(null);
              // 配置更改已保存到 interfaceChanges 状态中
            }}
          >
            保存更改
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DeviceInfo;