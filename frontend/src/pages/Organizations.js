import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Card, Alert, Modal, Row, Col } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck } from 'react-icons/fa';
import './Organizations.css';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [settingOrg, setSettingOrg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/organizations', {
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
      console.log('Fetched organizations:', data);
      
      setOrganizations(Array.isArray(data) ? data : []);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError(error.message || 'Failed to fetch organizations');
      setLoading(false);
    }
  };

  const handleNewOrganization = () => {
    navigate('/organizations/add');
  };

  const handleEditOrganization = (orgId) => {
    navigate(`/organizations/edit/${orgId}`);
  };

  const handleDeleteOrganization = (orgId) => {
    const org = organizations.find(o => (o._id || o.id) === orgId);
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const handleViewOrganization = (orgId) => {
    const org = organizations.find(o => (o._id || o.id) === orgId);
    setSelectedOrg(org);
    setShowViewModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrg) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${selectedOrg._id || selectedOrg.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the deleted organization from the list
      setOrganizations(prev => prev.filter(org => (org._id || org.id) !== (selectedOrg._id || selectedOrg.id)));
      setShowDeleteModal(false);
      setSelectedOrg(null);
      
    } catch (error) {
      console.error('Error deleting organization:', error);
      setError('Failed to delete organization: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetOrganization = async (orgId) => {
    const org = organizations.find(o => (o._id || o.id) === orgId);
    if (!org) return;

    setSettingOrg(orgId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/org/${orgId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if there's a new token in the response headers
      const newToken = response.headers.get('Refresh-JWT') || response.headers.get('refresh-jwt');
      if (newToken) {
        localStorage.setItem('token', newToken);
      }

      // Show success message
      setError(null);
      // You might want to refresh the page or update the UI to reflect the change
      alert(`Successfully set "${org.name}" as current organization!`);
      
    } catch (error) {
      console.error('Error setting organization:', error);
      setError('Failed to set organization: ' + error.message);
    } finally {
      setSettingOrg(null);
    }
  };

  if (loading) {
    return <div className="text-center">Loading organizations...</div>;
  }

  if (error) {
    return (
      <div className="organizations-page">
        <div className="page-header">
          <h2>Organizations</h2>
          <p className="text-muted">Manage your organizations</p>
        </div>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Organizations</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchOrganizations}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="organizations-page">
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2>Organizations</h2>
            <p className="text-muted">Manage your organizations</p>
          </div>
          <Button variant="primary" onClick={handleNewOrganization}>
            <FaPlus className="me-2" />
            New Organization
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body>
          {organizations.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Group</th>
                  <th>Tunnels Key Exchange Method</th>
                  <th>VXLAN Port</th>
                  <th>Tunnel Range</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org._id || org.id}>
                    <td><strong>{org.name}</strong></td>
                    <td>{org.description || '-'}</td>
                    <td>{org.group || '-'}</td>
                    <td>{org.encryptionMethod || 'PSK'}</td>
                    <td>{org.vxlanPort || '4789'}</td>
                    <td>{org.tunnelRange ? `${org.tunnelRange}/16` : '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleSetOrganization(org._id || org.id)}
                          title="Set Organization"
                          disabled={settingOrg === (org._id || org.id)}
                        >
                          {settingOrg === (org._id || org.id) ? '...' : <FaCheck />}
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewOrganization(org._id || org.id)}
                          title="View"
                        >
                          <FaEye />
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditOrganization(org._id || org.id)}
                          title="Edit"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteOrganization(org._id || org.id)}
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
          ) : (
            <Alert variant="info" className="text-center">
              No organizations found. Click "New Organization" to create one.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* View Organization Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Organization Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrg && (
            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Name:</strong>
                  <div>{selectedOrg.name}</div>
                </div>
                <div className="mb-3">
                  <strong>Group:</strong>
                  <div>{selectedOrg.group || '-'}</div>
                </div>
                <div className="mb-3">
                  <strong>VXLAN Port:</strong>
                  <div>{selectedOrg.vxlanPort || '4789'}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Tunnels Key Exchange Method:</strong>
                  <div>{selectedOrg.encryptionMethod || 'PSK'}</div>
                </div>
                <div className="mb-3">
                  <strong>Tunnel Range:</strong>
                  <div>{selectedOrg.tunnelRange ? `${selectedOrg.tunnelRange}/16` : '-'}</div>
                </div>
              </Col>
              <Col md={12}>
                <div className="mb-3">
                  <strong>Description:</strong>
                  <div>{selectedOrg.description || '-'}</div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrg && (
            <>
              <p>Are you sure you want to delete the organization <strong>"{selectedOrg.name}"</strong>?</p>
              <Alert variant="warning">
                <strong>Warning:</strong> This action cannot be undone. All data associated with this organization will be permanently deleted.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Organizations;