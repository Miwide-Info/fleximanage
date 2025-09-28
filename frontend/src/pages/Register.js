import React, { useState, useEffect, useRef } from 'react';
import { BRAND_NAME } from '../constants/branding';
import { Card, Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { sortCountries } from '../constants/countries';
import { SERVICE_TYPES } from '../constants/serviceTypes';
import { t } from '../i18n';

// Registration page with runtime + debug-enabled reCAPTCHA (mirrors Login implementation)
const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    accountName: '',
    userFirstName: '',
    userLastName: '',
    email: '',
    password: '',
    userJobTitle: '',
    userPhoneNumber: '',
    country: '',
    companySize: '',
    serviceType: '',
    numberSites: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRenderedRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({ country: '', serviceType: '' });
  const COUNTRY_REGEX = /^[A-Za-z]{2}$/; // exactly 2 letters (ISO alpha-2)
  const SERVICE_TYPE_REGEX = /^[A-Za-z0-9 -]{2,20}$/; // 2-20 letters/digits/space/dash
  const sortedCountries = sortCountries();

  // reCAPTCHA key resolution precedence
  const buildTimeKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const injectedKey = (typeof window !== 'undefined' && window.__RECAPTCHA_SITE_KEY__) || '';
  const [runtimeCaptchaKey, setRuntimeCaptchaKey] = useState('');
  const RECAPTCHA_SITE_KEY = buildTimeKey || injectedKey || runtimeCaptchaKey;
  const captchaKeySource = buildTimeKey ? 'build' : (injectedKey ? 'injected' : (runtimeCaptchaKey ? 'runtime' : 'none'));
  const CAPTCHA_DEBUG = (
    (process.env.REACT_APP_CAPTCHA_DEBUG === '1') ||
    (typeof window !== 'undefined' && (window.__CAPTCHA_DEBUG__ === true || localStorage.getItem('captchaDebug') === '1'))
  );

  // Fetch runtime config if no key yet
  useEffect(() => {
    if (!buildTimeKey && !injectedKey && !runtimeCaptchaKey) {
      CAPTCHA_DEBUG && console.log('[captcha][register] fetching /api/public/config');
      fetch('/api/public/config')
        .then(r => { CAPTCHA_DEBUG && console.log('[captcha][register] config status', r.status); return r.ok ? r.json() : Promise.reject(new Error('config http ' + r.status)); })
        .then(cfg => {
          CAPTCHA_DEBUG && console.log('[captcha][register] config body', cfg);
          if (cfg && cfg.captchaSiteKey) setRuntimeCaptchaKey(cfg.captchaSiteKey);
          else if (CAPTCHA_DEBUG) console.warn('[captcha][register] captchaSiteKey missing in response');
        })
        .catch(err => { CAPTCHA_DEBUG && console.warn('[captcha][register] fetch failed', err); });
    }
  }, [buildTimeKey, injectedKey, runtimeCaptchaKey, CAPTCHA_DEBUG]);

  // Load script & render captcha when key available
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) { CAPTCHA_DEBUG && console.log('[captcha][register] no site key yet, skip'); return; }
    if (captchaRenderedRef.current) return;
    if (typeof window === 'undefined') return;
    const ensureRender = () => {
      if (!window.grecaptcha || !window.grecaptcha.render) { CAPTCHA_DEBUG && console.log('[captcha][register] grecaptcha not ready retry'); return; }
      if (captchaRenderedRef.current) return;
      try {
        window.grecaptcha.ready(() => {
          const widgetId = window.grecaptcha.render('register-recaptcha', {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token) => { setCaptchaToken(token); CAPTCHA_DEBUG && console.log('[captcha][register] token received', token ? token.substring(0, 8) + '...' : '(empty)'); },
            'error-callback': () => setCaptchaToken(''),
            'expired-callback': () => setCaptchaToken('')
          });
            captchaRenderedRef.current = true;
            CAPTCHA_DEBUG && console.log('[captcha][register] widget rendered id=', widgetId);
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('reCAPTCHA render failed (register)', e);
        CAPTCHA_DEBUG && console.warn('[captcha][register] render exception', e);
      }
    };
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = ensureRender;
      document.head.appendChild(script);
      CAPTCHA_DEBUG && console.log('[captcha][register] script tag injected');
    } else {
      ensureRender();
    }
  }, [RECAPTCHA_SITE_KEY, CAPTCHA_DEBUG]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'country') {
      v = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2); // sanitize to letters only & length 2
    }
    setForm(prev => ({ ...prev, [name]: v }));
    // live validation for modified field
    if (name === 'country') {
      setFieldErrors(prev => ({ ...prev, country: v && !COUNTRY_REGEX.test(v) ? t('register.validation.country') : '' }));
    } else if (name === 'serviceType') {
      setFieldErrors(prev => ({ ...prev, serviceType: v && !SERVICE_TYPE_REGEX.test(v) ? t('register.validation.serviceType') : '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { ...form };
      body.numberSites = parseInt(body.numberSites || 1, 10);
      // Client-side validation prior to submit
      const errs = {
        country: !COUNTRY_REGEX.test(body.country || '') ? t('register.validation.country') : '',
        serviceType: !SERVICE_TYPE_REGEX.test(body.serviceType || '') ? t('register.validation.serviceType') : ''
      };
      setFieldErrors(errs);
      const firstErr = Object.values(errs).find(Boolean);
      if (firstErr) {
        setError(firstErr);
        setLoading(false);
        return;
      }
      if (RECAPTCHA_SITE_KEY) {
        if (!captchaToken) {
          setError(t('register.validation.captcha'));
          setLoading(false);
          return;
        }
        body.captcha = captchaToken;
      }
      const resp = await api.post('/users/register', body);
      const fast = resp.data?.fastVerified ? 1 : 0;
      navigate(`/login?registered=1&fast=${fast}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Registration error', err);
      const apiErr = err?.response?.data?.error || err?.response?.data?.message;
      setError(apiErr || 'Registration failed. Please try again.'); // TODO i18n
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
                <h2 className="login-title">{t('register.title')}</h2>
                <p className="text-muted">{t('register.subtitle', BRAND_NAME)}</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit} autoComplete="off">
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>{t('register.labels.accountName')} *</Form.Label>
                    <Form.Control name="accountName" value={form.accountName} onChange={handleChange} required />
                  </Col>
                  <Col md={3} className="mb-3">
                    <Form.Label>{t('register.labels.firstName')} *</Form.Label>
                    <Form.Control name="userFirstName" value={form.userFirstName} onChange={handleChange} required />
                  </Col>
                  <Col md={3} className="mb-3">
                    <Form.Label>{t('register.labels.lastName')} *</Form.Label>
                    <Form.Control name="userLastName" value={form.userLastName} onChange={handleChange} required />
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>{t('register.labels.email')} *</Form.Label>
                    <Form.Control type="email" name="email" value={form.email} onChange={handleChange} required />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>{t('register.labels.password')} *</Form.Label>
                    <Form.Control type="password" name="password" value={form.password} onChange={handleChange} required />
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>{t('register.labels.jobTitle')}</Form.Label>
                    <Form.Control name="userJobTitle" value={form.userJobTitle} onChange={handleChange} />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>{t('register.labels.phone')}</Form.Label>
                    <Form.Control name="userPhoneNumber" value={form.userPhoneNumber} onChange={handleChange} />
                  </Col>
                </Row>
                <Row>
                  <Col md={4} className="mb-3">
                    <Form.Label>{t('register.labels.country')}</Form.Label>
                    <Form.Select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.country}
                      required
                    >
                      <option value="">-- {t('register.labels.country')} --</option>
                      {sortedCountries.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.country || t('register.validation.country')}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>{t('register.labels.companySize')}</Form.Label>
                    <Form.Control name="companySize" value={form.companySize} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>{t('register.labels.serviceType')}</Form.Label>
                    <Form.Select
                      name="serviceType"
                      value={form.serviceType}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.serviceType}
                      required
                    >
                      <option value="">-- {t('register.labels.serviceType')} --</option>
                      {SERVICE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.serviceType || t('register.validation.serviceType')}
                    </Form.Control.Feedback>
                  </Col>
                </Row>
                <Row>
                  <Col md={4} className="mb-3">
                    <Form.Label>{t('register.labels.numberSites')}</Form.Label>
                    <Form.Control name="numberSites" type="number" min="1" value={form.numberSites} onChange={handleChange} />
                  </Col>
                  {RECAPTCHA_SITE_KEY && (
                    <Col md={8} className="mb-3">
                      <Form.Label>{t('register.labels.captcha')} *</Form.Label>
                      <div id="register-recaptcha" style={{ display: 'flex', justifyContent: 'center' }} />
                    </Col>
                  )}
                </Row>

                {CAPTCHA_DEBUG && (
                  <div className="mb-2 small alert alert-info p-2">
                    <div><strong>{t('register.debug')}</strong></div>
                    <div>source: {captchaKeySource} | hasKey: {RECAPTCHA_SITE_KEY ? 'yes' : 'no'} | scriptLoaded: {typeof window !== 'undefined' && window.grecaptcha ? 'yes' : 'no'}</div>
                    <div>token: {captchaToken ? (captchaToken.substring(0, 12) + '...') : '(empty)'}</div>
                  </div>
                )}

                <div className="d-grid mt-2">
                  <Button type="submit" variant="primary" size="lg" disabled={loading}>
                    {loading ? t('register.labels.submit') + '...' : t('register.labels.submit')}
                  </Button>
                </div>
                <div className="text-center mt-3">
                  <small className="text-muted">{t('register.helper.haveAccount')} <Link to="/login">{t('register.helper.signIn')}</Link></small>
                </div>
                <div className="text-center mt-2">
                  <small className="text-muted">{t('register.helper.requiredNote')}</small>
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
