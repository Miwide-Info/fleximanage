import React, { useState, useEffect, useRef } from 'react';
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/branding';
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
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRenderedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  // reCAPTCHA site key (v2 checkbox). Order of precedence:
  // 1. Build-time env (REACT_APP_RECAPTCHA_SITE_KEY)
  // 2. Injected global window.__RECAPTCHA_SITE_KEY__ (if manually set by operator)
  // 3. Runtime fetch from /api/public/config (added for flexibility – no rebuild required when rotating key)
  const buildTimeKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const injectedKey = (typeof window !== 'undefined' && window.__RECAPTCHA_SITE_KEY__) || '';
  const [runtimeCaptchaKey, setRuntimeCaptchaKey] = useState('');
  const [captchaEnforced, setCaptchaEnforced] = useState(false);
  const [captchaWarning, setCaptchaWarning] = useState('');
  const RECAPTCHA_SITE_KEY = buildTimeKey || injectedKey || runtimeCaptchaKey;
  const captchaKeySource = buildTimeKey ? 'build' : (injectedKey ? 'injected' : (runtimeCaptchaKey ? 'runtime' : 'none'));

  // Debug flag (multi-source): build env, window toggle, or localStorage key
  const CAPTCHA_DEBUG = (
    (process.env.REACT_APP_CAPTCHA_DEBUG === '1') ||
    (typeof window !== 'undefined' && (window.__CAPTCHA_DEBUG__ === true || localStorage.getItem('captchaDebug') === '1'))
  );

  // Dynamically load reCAPTCHA script only if key provided and not already loaded
  useEffect(() => {
    // If no key at all yet (build + injected both empty) attempt runtime fetch once
    if (!buildTimeKey && !injectedKey && !runtimeCaptchaKey) {
      CAPTCHA_DEBUG && console.log('[captcha][login] fetching /api/public/config');
      fetch('/api/public/config')
        .then(r => {
          CAPTCHA_DEBUG && console.log('[captcha][login] config status', r.status);
          return r.ok ? r.json() : Promise.reject(new Error('config http ' + r.status));
        })
        .then(cfg => {
          CAPTCHA_DEBUG && console.log('[captcha][login] config body', cfg);
          if (cfg && cfg.captchaSiteKey) {
            setRuntimeCaptchaKey(cfg.captchaSiteKey);
            setCaptchaEnforced(!!cfg.captchaEnforced);
          } else if (CAPTCHA_DEBUG) {
            console.warn('[captcha][login] captchaSiteKey missing in response');
            setCaptchaEnforced(!!cfg?.captchaEnforced);
          }
        })
        .catch(err => { CAPTCHA_DEBUG && console.warn('[captcha][login] fetch failed', err); });
    }
  // run only on mount / initial keys state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When we have a key (from any source) load script & render widget
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      CAPTCHA_DEBUG && console.log('[captcha][login] no site key yet, skip script load');
      return; // still no captcha configured
    }
    if (captchaRenderedRef.current) return; // already rendered
    if (typeof window === 'undefined') return;

    const ensureRender = () => {
      if (!window.grecaptcha || !window.grecaptcha.render) {
        CAPTCHA_DEBUG && console.log('[captcha][login] grecaptcha not ready on ensureRender retry');
        return;
      }
      if (captchaRenderedRef.current) return;
      try {
        window.grecaptcha.ready(() => {
          const widgetId = window.grecaptcha.render('login-recaptcha', {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token) => {
              setCaptchaToken(token);
              CAPTCHA_DEBUG && console.log('[captcha][login] token received', token ? token.substring(0, 8) + '...' : '(empty)');
            },
            'error-callback': () => setCaptchaToken(''),
            'expired-callback': () => setCaptchaToken('')
          });
          captchaRenderedRef.current = true;
          CAPTCHA_DEBUG && console.log('[captcha][login] widget rendered id=', widgetId);
        });
      } catch (e) {
        // swallow render errors, user will see fallback if needed
        // eslint-disable-next-line no-console
        console.warn('reCAPTCHA render failed', e);
        CAPTCHA_DEBUG && console.warn('[captcha][login] render exception', e);
      }
    };

    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = ensureRender;
      document.head.appendChild(script);
      CAPTCHA_DEBUG && console.log('[captcha][login] script tag injected');
    } else {
      ensureRender();
    }

    // Watchdog: if enforced & key present but widget not rendered within timeout, allow fallback warning
    const watchdogMs = 6000; // 6s
    const watchdog = setTimeout(() => {
      if (!captchaRenderedRef.current) {
        const msg = captchaEnforced
          ? 'CAPTCHA failed to load. Please retry or check network; login may be blocked.'
          : 'CAPTCHA unavailable (not loaded). Proceeding without challenge.';
        setCaptchaWarning(msg);
        CAPTCHA_DEBUG && console.warn('[captcha][login] watchdog warning', msg);
      }
    }, watchdogMs);

    return () => clearTimeout(watchdog);
  }, [RECAPTCHA_SITE_KEY]);

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
      // If captcha configured, require token before submit
      if (RECAPTCHA_SITE_KEY && captchaEnforced && !captchaToken) {
        setError('Please complete the CAPTCHA');
        setLoading(false);
        return;
      }

      // Call backend login API (captcha token optionally included)
      const response = await api.post('/users/login', {
        username: credentials.username,
        password: credentials.password,
        captcha: captchaToken || undefined
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
                <h2 className="login-title">{BRAND_NAME}</h2>
                <p className="text-muted">{BRAND_TAGLINE}</p>
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

                {RECAPTCHA_SITE_KEY && (
                  <div className="mb-3">
                    <div id="login-recaptcha" style={{ display: 'flex', justifyContent: 'center' }} />
                  </div>
                )}
                {captchaWarning && (
                  <div className={`mb-3 small alert ${captchaEnforced ? 'alert-danger' : 'alert-warning'} p-2`}>{captchaWarning}</div>
                )}
                {CAPTCHA_DEBUG && (
                  <div className="mb-2 small alert alert-info p-2">
                    <div><strong>Captcha Debug</strong></div>
                    <div>source: {captchaKeySource} | hasKey: {RECAPTCHA_SITE_KEY ? 'yes' : 'no'} | scriptLoaded: {typeof window !== 'undefined' && window.grecaptcha ? 'yes' : 'no'} | enforced: {captchaEnforced ? 'yes' : 'no'}</div>
                    <div>token: {captchaToken ? (captchaToken.substring(0, 12) + '...') : '(empty)'}</div>
                  </div>
                )}

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