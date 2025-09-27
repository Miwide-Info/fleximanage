import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query params for registration success messages
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('registered')) {
      const fast = params.get('fast') === '1';
      setInfo(`Registration successful${fast ? ' (auto-verified)' : ''}. You can now sign in.`);
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call backend login API
      const response = await api.post('/users/login', {
        username: credentials.username,
        password: credentials.password
      });

      // Distinguish between 2FA login flow vs final JWT issuance.
      // 2FA pre-step returns only { name, token } (no refreshToken header/body combination).
      const hasProcessTokenOnly = response.data?.token && !response.data?.refreshToken;
      if (hasProcessTokenOnly) {
        localStorage.setItem('loginToken', response.data.token);
        setError('2FA authentication required. This feature is not yet implemented.');
        return;
      }

      // Final login: backend returns token+refreshToken in body AND also in headers.
      const headerToken = response.headers['refresh-jwt'] || response.headers['Refresh-JWT'];
      const bodyToken = response.data?.token;
      const finalToken = headerToken || bodyToken;
      if (finalToken) {
        localStorage.setItem('token', finalToken);
        onLogin(); // update parent auth state
        // Navigate explicitly to home to avoid blank content when current path is /login
        navigate('/home', { replace: true });
      } else {
        setError('Login failed: No token received from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="login-container">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col md={6} lg={4}>
          <Card className="login-card">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="login-title">FlexiManage</h2>
                <p className="text-muted">SD-WAN Management Platform</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              {!error && info && (
                <Alert variant="success" className="mb-4">
                  {info}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaUser />
                    </span>
                    <Form.Control
                      type="text"
                      name="username"
                      value={credentials.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaLock />
                    </span>
                    <Form.Control
                      type="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <small className="text-muted">
                  Don't have an account? <Link to="/register">Register</Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;