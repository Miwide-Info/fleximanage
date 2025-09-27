import React from 'react';
import { Card } from 'react-bootstrap';
import { FaShieldAlt } from 'react-icons/fa';

const Firewall = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2><FaShieldAlt className="me-2" />Firewall Policies</h2>
        <p className="text-muted">Manage firewall rules and security policies</p>
      </div>

      <Card>
        <Card.Body className="text-center py-5">
          <FaShieldAlt size={64} className="text-muted mb-3" />
          <h4>Firewall Management</h4>
          <p className="text-muted">Firewall policy management interface will be implemented here.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Firewall;