import React from 'react';
import { Card } from 'react-bootstrap';
import { FaTachometerAlt } from 'react-icons/fa';

const QoS = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2><FaTachometerAlt className="me-2" />QoS Policies</h2>
        <p className="text-muted">Configure Quality of Service policies</p>
      </div>

      <Card>
        <Card.Body className="text-center py-5">
          <FaTachometerAlt size={64} className="text-muted mb-3" />
          <h4>QoS Management</h4>
          <p className="text-muted">Quality of Service policy configuration will be implemented here.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default QoS;