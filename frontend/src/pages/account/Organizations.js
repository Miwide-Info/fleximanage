import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/unified-table.css';

// Organizations management page:
// - Lists organizations (GET /organizations)
// - Create organization (POST /organizations) with minimal required fields
//   required by OpenAPI: name, group, encryptionMethod
// - Shows basic fields (name, group, encryptionMethod)
// - Future enhancements: edit/delete, pagination, search.

const DEFAULT_FORM = {
  name: '',
  description: '',
  group: '',
  encryptionMethod: 'ikev2',
  vxlanPort: '4789',
  tunnelRange: ''
};

const AccountOrganizations = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await api.get('/organizations');
      const data = Array.isArray(resp.data) ? resp.data : [];
      setOrgs(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required'); return; }
    if (!form.group.trim()) { setError('Group required'); return; }
    setCreating(true); setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        group: form.group.trim(),
        encryptionMethod: form.encryptionMethod || 'ikev2'
      };
      if (form.description) payload.description = form.description.trim();
      if (form.vxlanPort) payload.vxlanPort = form.vxlanPort.trim();
      if (form.tunnelRange) payload.tunnelRange = form.tunnelRange.trim();
      const resp = await api.post('/organizations', payload);
      if (resp.data) setOrgs(prev => [resp.data, ...prev]);
      setShowModal(false);
      setForm(DEFAULT_FORM);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page account-organizations">
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <h2 className="m-0">Organizations</h2>
        <button className="btn btn-sm btn-primary" onClick={() => { setShowModal(true); setError(null); }}>
          Add Organization
        </button>
      </div>
      <p className="text-muted">Manage organizations you belong to.</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading ? <p>Loading...</p> : (
        orgs.length === 0 ? <p>No organizations.</p> : (
          <div className="unified-table-container">
            <div className="unified-table-header">
              <h5>Organizations</h5>
            </div>
            <div className="unified-table-responsive">
              <table className="unified-table table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Group</th>
                    <th>Encryption</th>
                    <th>Description</th>
                  </tr>
                </thead>
              <tbody>
                {orgs.map(o => (
                  <tr key={o._id || o.id}>
                    <td>{o.name}</td>
                    <td>{o.group}</td>
                    <td>{o.encryptionMethod}</td>
                    <td className="text-truncate" style={{ maxWidth: 240 }}>{o.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}

      {showModal && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1040 }} onClick={() => setShowModal(false)} />
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={handleCreate}>
                  <div className="modal-header py-2">
                    <h6 className="modal-title">Add Organization</h6>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="mb-2">
                      <label className="form-label">Name<span className="text-danger ms-1">*</span></label>
                      <input className="form-control form-control-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={64} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Group<span className="text-danger ms-1">*</span></label>
                      <input className="form-control form-control-sm" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} required maxLength={64} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Encryption Method</label>
                      <select className="form-select form-select-sm" value={form.encryptionMethod} onChange={e => setForm(f => ({ ...f, encryptionMethod: e.target.value }))}>
                        <option value="none">none</option>
                        <option value="psk">psk</option>
                        <option value="ikev2">ikev2</option>
                      </select>
                    </div>
                    <div className="row g-2">
                      <div className="col-sm-6">
                        <label className="form-label">VXLAN Port</label>
                        <input className="form-control form-control-sm" value={form.vxlanPort} onChange={e => setForm(f => ({ ...f, vxlanPort: e.target.value }))} />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label">Tunnel Range</label>
                        <input className="form-control form-control-sm" placeholder="10.100.0.0" value={form.tunnelRange} onChange={e => setForm(f => ({ ...f, tunnelRange: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-2 mt-2">
                      <label className="form-label">Description</label>
                      <textarea className="form-control form-control-sm" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <p className="small text-muted mb-0">Fields marked * are required. Additional settings can be edited later.</p>
                  </div>
                  <div className="modal-footer py-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(false)} disabled={creating}>Cancel</button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountOrganizations;
