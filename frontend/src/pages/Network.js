import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { FaNetworkWired, FaMapMarkerAlt, FaServer } from 'react-icons/fa';
import './Network.css';

const Network = () => {
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      // Mock data - replace with actual API call
      const mockNetworks = [
        {
          id: 'NET001',
          name: 'Corporate Network',
          type: 'LAN',
          subnet: '192.168.1.0/24',
          devices: 12,
          status: 'active',
          location: 'Headquarters'
        },
        {
          id: 'NET002',
          name: 'Branch Network',
          type: 'WAN',
          subnet: '10.0.0.0/16',
          devices: 8,
          status: 'active',
          location: 'Branch Office'
        },
        {
          id: 'NET003',
          name: 'DMZ Network',
          type: 'DMZ',
          subnet: '172.16.0.0/24',
          devices: 3,
          status: 'warning',
          location: 'Data Center'
        }
      ];
      setNetworks(mockNetworks);
      setSelectedNetwork(mockNetworks[0]);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      warning: 'warning',
      inactive: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="network-page">
      <div className="page-header">
        <h2>Network Management</h2>
        <p className="text-muted">Monitor and manage your network topology</p>
      </div>

      <Row>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5><FaNetworkWired className="me-2" />Networks</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {networks.map((network) => (
                <ListGroup.Item
                  key={network.id}
                  active={selectedNetwork?.id === network.id}
                  onClick={() => setSelectedNetwork(network)}
                  className="cursor-pointer"
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{network.name}</strong>
                      <br />
                      <small className="text-muted">{network.subnet}</small>
                    </div>
                    {getStatusBadge(network.status)}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col md={8}>
          {selectedNetwork ? (
            <Card>
              <Card.Header>
                <h5>{selectedNetwork.name} Details</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="network-detail">
                      <h6><FaNetworkWired className="me-2" />Network Information</h6>
                      <p><strong>ID:</strong> {selectedNetwork.id}</p>
                      <p><strong>Type:</strong> {selectedNetwork.type}</p>
                      <p><strong>Subnet:</strong> {selectedNetwork.subnet}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedNetwork.status)}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="network-detail">
                      <h6><FaMapMarkerAlt className="me-2" />Location & Devices</h6>
                      <p><strong>Location:</strong> {selectedNetwork.location}</p>
                      <p><strong>Devices:</strong> <FaServer className="me-1" />{selectedNetwork.devices}</p>
                      <p><strong>Last Updated:</strong> 2025-09-26 14:30:00</p>
                    </div>
                  </Col>
                </Row>

                <div className="network-topology mt-4">
                  <h6>Network Topology</h6>
                  <div className="topology-placeholder">
                    <div className="topology-node main-node">
                      <FaServer />
                      <span>Gateway</span>
                    </div>
                    <div className="topology-connections">
                      {Array.from({ length: selectedNetwork.devices }, (_, i) => (
                        <div key={i} className="topology-node device-node">
                          <FaServer />
                          <span>Device {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body className="text-center text-muted">
                <FaNetworkWired size={48} className="mb-3" />
                <p>Select a network to view details</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default Network;