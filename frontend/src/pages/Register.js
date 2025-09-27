import React, { useState } from 'react';
import { Card, Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

// Minimal registration page matching backend /users/register contract.
// Sends required fields; optional ones get sensible dev defaults.
// On success redirects to /login with query params so Login page can show a success banner.
const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    accountName: '',
    userFirstName: '',
    userLastName: '',
    email: '',
    password: '',
    captcha: '',
    userJobTitle: '',
    userPhoneNumber: '',
    country: '',
    companySize: '',
    serviceType: '',
    numberSites: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { ...form };
      // Coerce numberSites to number
      body.numberSites = parseInt(body.numberSites || 1, 10);

      const resp = await api.post('/users/register', body);
      const fast = resp.data?.fastVerified ? 1 : 0;
      navigate(`/login?registered=1&fast=${fast}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Registration error', err);
      const apiErr = err?.response?.data?.error || err?.response?.data?.message; // backend uses createError
      setError(apiErr || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="login-container">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col md={8} lg={6} xl={5}>
          <Card className="login-card">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="login-title">Create Account</h2>
                <p className="text-muted">Register your FlexiManage account</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit} autoComplete="off">
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Account / Company Name *</Form.Label>
                    <Form.Control name="accountName" value={form.accountName} onChange={handleChange} required />
                  </Col>
                  <Col md={3} className="mb-3">
                    <Form.Label>First Name *</Form.Label>
                    <Form.Control name="userFirstName" value={form.userFirstName} onChange={handleChange} required />
                  </Col>
                  <Col md={3} className="mb-3">
                    <Form.Label>Last Name *</Form.Label>
                    <Form.Control name="userLastName" value={form.userLastName} onChange={handleChange} required />
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Email *</Form.Label>
                    <Form.Control type="email" name="email" value={form.email} onChange={handleChange} required />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control type="password" name="password" value={form.password} onChange={handleChange} required />
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Job Title</Form.Label>
                    <Form.Control name="userJobTitle" value={form.userJobTitle} onChange={handleChange} />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control name="userPhoneNumber" value={form.userPhoneNumber} onChange={handleChange} />
                  </Col>
                </Row>
                <Row>
                  <Col md={4} className="mb-3">
                    <Form.Label>Country</Form.Label>
                    <Form.Control name="country" value={form.country} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Company Size</Form.Label>
                    <Form.Control name="companySize" value={form.companySize} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Service Type</Form.Label>
                    <Form.Control name="serviceType" value={form.serviceType} onChange={handleChange} />
                  </Col>
                </Row>
                <Row>
                  <Col md={4} className="mb-3">
                    <Form.Label>Number of Sites</Form.Label>
                    <Form.Control name="numberSites" type="number" min="1" value={form.numberSites} onChange={handleChange} />
                  </Col>
                  <Col md={8} className="mb-3">
                    <Form.Label>Captcha Token *</Form.Label>
                    <Form.Control name="captcha" value={form.captcha} onChange={handleChange} required placeholder="Enter captcha token" />
                  </Col>
                </Row>
                <div className="d-grid mt-2">
                  <Button type="submit" variant="primary" size="lg" disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
                  </Button>
                </div>
                <div className="text-center mt-3">
                  <small className="text-muted">Already have an account? <Link to="/login">Sign in</Link></small>
                </div>
                <div className="text-center mt-2">
                  <small className="text-muted">Fields marked with * are required</small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
