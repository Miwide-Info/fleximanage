import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import './AddOrganization.css';

const AddOrganization = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group: 'Default',
    encryptionMethod: 'psk',
    vxlanPort: '4789',
    tunnelRange: '10.100.0.0'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Organization Name is required');
      setLoading(false);
      return;
    }

    if (!formData.group.trim()) {
      setError('Organization Group is required');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Extract IP address from CIDR notation if provided
      let tunnelRangeIP = formData.tunnelRange.trim();
      if (tunnelRangeIP.includes('/')) {
        tunnelRangeIP = tunnelRangeIP.split('/')[0];
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        group: formData.group.trim(),
        encryptionMethod: formData.encryptionMethod,
        vxlanPort: parseInt(formData.vxlanPort) || 4789,
        tunnelRange: tunnelRangeIP
      };

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Organization created:', result);
      
      setSuccess('Organization created successfully!');
      
      // Redirect back to organizations list after a short delay
      setTimeout(() => {
        navigate('/organizations');
      }, 2000);

    } catch (error) {
      console.error('Error creating organization:', error);
      setError(error.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/organizations');
  };

  return (
    <div className="add-organization-page">
      <div className="page-header">
        <div className="d-flex align-items-center gap-3 mb-3">
          <Button variant="outline-secondary" onClick={handleBack}>
            <FaArrowLeft className="me-2" />
            Back to Organizations
          </Button>
        </div>
        <h2>Add New Organization</h2>
        <p className="text-muted">Create a new organization to manage your network</p>
      </div>

      <Card>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mb-4">
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Organization Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Organization Name"
                    required
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Organization Group <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="group"
                    value={formData.group}
                    onChange={handleInputChange}
                    placeholder="Default"
                    required
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Description"
                disabled={loading}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tunnels Key Exchange Method</Form.Label>
                  <Form.Select
                    name="encryptionMethod"
                    value={formData.encryptionMethod}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="psk">PSK</option>
                    <option value="ikev2">IKEv2</option>
                    <option value="none">None</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>VXLAN Port</Form.Label>
                  <Form.Control
                    type="number"
                    name="vxlanPort"
                    value={formData.vxlanPort}
                    onChange={handleInputChange}
                    placeholder="4789"
                    min="1"
                    max="65535"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Tunnel Range</Form.Label>
              <Form.Control
                type="text"
                name="tunnelRange"
                value={formData.tunnelRange}
                onChange={handleInputChange}
                placeholder="10.100.0.0"
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Base IP address for tunnel networks (e.g., 10.100.0.0). Subnet mask /16 will be applied automatically.
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-3">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={loading}
                className="d-flex align-items-center"
              >
                <FaPlus className="me-2" />
                {loading ? 'Adding...' : 'Add'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline-secondary" 
                onClick={handleBack}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AddOrganization;