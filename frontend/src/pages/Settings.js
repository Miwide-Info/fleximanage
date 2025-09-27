import React from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { FaCog, FaUser, FaShieldAlt, FaDatabase, FaNetworkWired } from 'react-icons/fa';

const Settings = () => {
  const settingsSections = [
    { icon: <FaUser />, title: 'User Management', description: 'Manage users and permissions' },
    { icon: <FaShieldAlt />, title: 'Security', description: 'Configure security settings' },
    { icon: <FaDatabase />, title: 'Database', description: 'Database configuration and backup' },
    { icon: <FaNetworkWired />, title: 'Network', description: 'Network settings and policies' },
    { icon: <FaCog />, title: 'System', description: 'System configuration and maintenance' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><FaCog className="me-2" />Settings</h2>
        <p className="text-muted">Configure system settings and preferences</p>
      </div>

      <Card>
        <ListGroup variant="flush">
          {settingsSections.map((section, index) => (
            <ListGroup.Item key={index} className="settings-item">
              <div className="d-flex align-items-center">
                <div className="settings-icon me-3">
                  {section.icon}
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-1">{section.title}</h5>
                  <p className="text-muted mb-0">{section.description}</p>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    </div>
  );
};

export default Settings;