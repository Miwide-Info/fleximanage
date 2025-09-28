import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

// Simple account verification page. Extracts id & token (t) from query string and
// POSTs them to /api/users/verify-account. Shows result & link back to login.
export default function VerifyAccount () {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending'); // pending | success | already | error
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const token = params.get('t');
    if (!id || !token) {
      setStatus('error');
      setMessage('Missing verification parameters. Please use the link from your email.');
      return;
    }
    (async () => {
      try {
        const resp = await api.post('/users/verify-account', { id, token });
        if (resp.data?.status === 'account verified') {
          setStatus('success');
          setMessage('Your account has been verified. You can now sign in.');
          // Auto redirect to login after short delay with flag so login page can show info (optional)
          setTimeout(() => navigate('/login?registered=1&fast=0', { replace: true }), 2500);
        } else if (resp.data?.status === 'account already verified') {
          setStatus('already');
          setMessage('Your account is already verified. You can sign in.');
          setTimeout(() => navigate('/login?registered=1&fast=1', { replace: true }), 2000);
        } else {
          setStatus('success');
          setMessage('Verification completed. You can sign in.');
          setTimeout(() => navigate('/login?registered=1', { replace: true }), 2500);
        }
      } catch (e) {
        setStatus('error');
        if (e.response?.data?.error === 'Verification Error') {
          setMessage('Verification failed. The link may be invalid or already used. If you already verified, just sign in.');
        } else {
          setMessage('Unexpected error verifying account. Please try again or request a new verification email.');
        }
      }
    })();
  }, [location.search, navigate]);

  const color = status === 'success' || status === 'already' ? 'success' : (status === 'error' ? 'danger' : 'secondary');

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <div className={`alert alert-${color}`} style={{ maxWidth: 560 }}>
        <h5 className="mb-2">Account Verification</h5>
        <div>{message}</div>
        {status === 'error' && (
          <div className="mt-3">
            <button className="btn btn-outline-primary btn-sm me-2" onClick={() => window.location.reload()}>Retry</button>
            <button className="btn btn-link btn-sm" onClick={() => navigate('/login')}>Go to Login</button>
          </div>
        )}
        {(status === 'success' || status === 'already') && (
          <div className="mt-3 small text-muted">Redirecting to login...</div>
        )}
      </div>
    </div>
  );
}
