import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { sortCountries } from '../../constants/countries';

// Account Profile page
// Displays current (selected) account info and allows updating editable fields:
// name, country, companyType, companyDesc, forceMfa
// Backend enforces that only current defaultAccount can be accessed.
// Account id derived from JWT payload (token stored in localStorage on login).

const COUNTRY_REGEX = /^[A-Za-z]{2}$/; // ISO alpha-2

function decodeToken () {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) { return null; }
}

export default function AccountProfile () {
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [acct, setAcct] = useState(null);
  const [form, setForm] = useState({ name: '', country: '', forceMfa: false });
  const [fieldErrors, setFieldErrors] = useState({ country: '' });
  const countries = sortCountries();

  // Derive account id once
  useEffect(() => {
    const payload = decodeToken();
    if (payload?.account) {
      setAccountId(payload.account);
    } else {
      setError('No account selected in token. Please log in again.');
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const resp = await api.get(`/accounts/${id}`);
      setAcct(resp.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load account profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (accountId) load(accountId); }, [accountId, load]);

  const openEdit = () => {
    if (!acct) return;
    setForm({
      name: acct.name || '',
      country: (acct.country || '').toUpperCase(),
      forceMfa: !!acct.forceMfa
    });
    setFieldErrors({ country: '' });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'country') {
      v = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      setFieldErrors(prev => ({ ...prev, country: v && !COUNTRY_REGEX.test(v) ? 'Country must be 2 letters (ISO alpha-2)' : '' }));
    }
    setForm(f => ({ ...f, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fieldErrors.country) return;
    if (!COUNTRY_REGEX.test(form.country)) {
      setFieldErrors(prev => ({ ...prev, country: 'Country must be 2 letters (ISO alpha-2)' }));
      return;
    }
    setSaving(true); setError(null);
    try {
      const body = {
        name: form.name.trim(),
        country: form.country.toUpperCase(),
        forceMfa: !!form.forceMfa
      };
      const resp = await api.put(`/accounts/${accountId}`, body);
      // Update displayed account
      setAcct(resp.data);
      // If backend returns updated token in Refresh-JWT header, persist it
      const newToken = resp.headers['refresh-jwt'] || resp.headers['Refresh-JWT'];
      if (newToken) localStorage.setItem('token', newToken);
      setShowModal(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="page account-profile">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h2 className="m-0">Account Profile</h2>
        {acct && (
          <button className="btn btn-sm btn-primary" onClick={openEdit}>Update</button>
        )}
      </div>
      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
      {loading && <p>Loading...</p>}
      {!loading && !acct && !error && <p>No account data available.</p>}
      {acct && !loading && (
        <div className="card mb-3">
          <div className="card-body p-4">
            <div className="row g-4">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><strong>Company Name :</strong></label>
                  <div className="form-control-plaintext">{acct.name || '-'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><strong>Country :</strong></label>
                  <div className="form-control-plaintext">{acct.country || '-'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><strong>Force Two-Factor-authenticator :</strong></label>
                  <div className="form-control-plaintext">{acct.forceMfa ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-muted small mb-0">Updates to name or force MFA will refresh your token automatically.</p>

      {showModal && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1040 }} onClick={() => setShowModal(false)} />
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={handleSubmit}>
                  <div className="modal-header py-2">
                    <h6 className="modal-title">Update Account Profile</h6>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Company Name</label>
                        <input className="form-control" maxLength={64} name="name" value={form.name} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Country</label>
                        <select className={`form-select ${fieldErrors.country ? 'is-invalid' : ''}`} name="country" value={form.country} onChange={handleChange} required>
                          <option value="">-- Select Country --</option>
                          {countries.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                        </select>
                        {fieldErrors.country && <div className="invalid-feedback">{fieldErrors.country}</div>}
                      </div>
                      <div className="col-md-6">
                        <div className="form-check mt-3">
                          <input className="form-check-input" type="checkbox" id="forceMfa" name="forceMfa" checked={form.forceMfa} onChange={handleChange} />
                          <label className="form-check-label" htmlFor="forceMfa">Force Two-Factor-authenticator</label>
                        </div>
                      </div>
                    </div>
                    <p className="small text-muted mt-3 mb-0">Enabling Force Two-Factor-authenticator requires all users to configure MFA before accessing this account.</p>
                  </div>
                  <div className="modal-footer py-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
