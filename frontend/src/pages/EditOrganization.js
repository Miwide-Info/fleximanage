import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import './AddOrganization.css';

const EditOrganization = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group: '',
    encryptionMethod: 'psk',
    vxlanPort: '4789',
    tunnelRange: ''
  });

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/organizations/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const org = await response.json();
      setFormData({
        name: org.name || '',
        description: org.description || '',
        group: org.group || '',
        encryptionMethod: org.encryptionMethod || 'psk',
        vxlanPort: String(org.vxlanPort || 4789),
        tunnelRange: org.tunnelRange || ''
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError(error.message || 'Failed to fetch organization');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Organization Name is required');
      setSaving(false);
      return;
    }

    if (!formData.group.trim()) {
      setError('Organization Group is required');  
      setSaving(false);
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

      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
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
      console.log('Organization updated:', result);
      
      setSuccess('Organization updated successfully!');
      
      // Redirect back to organizations list after a short delay
      setTimeout(() => {
        navigate('/organizations');
      }, 2000);

    } catch (error) {
      console.error('Error updating organization:', error);
      setError(error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/organizations');
  };

  if (loading) {
    return <div className="text-center">Loading organization...</div>;
  }

  return (
    <div className="add-organization-page">
      <div className="page-header">
        <div className="d-flex align-items-center gap-3 mb-3">
          <Button variant="outline-secondary" onClick={handleBack}>
            <FaArrowLeft className="me-2" />
            Back to Organizations
          </Button>
        </div>
        <h2>Edit Organization</h2>
        <p className="text-muted">Update organization settings</p>
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
                    disabled={saving}
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
                    disabled={saving}
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
                disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
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
                disabled={saving}
              />
              <Form.Text className="text-muted">
                Base IP address for tunnel networks (e.g., 10.100.0.0). Subnet mask /16 will be applied automatically.
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-3">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={saving}
                className="d-flex align-items-center"
              >
                <FaSave className="me-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline-secondary" 
                onClick={handleBack}
                disabled={saving}
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

export default EditOrganization;