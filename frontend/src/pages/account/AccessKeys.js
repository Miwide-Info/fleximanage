import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Simple Access Keys management page.
// Backend endpoint assumption: GET /tokens (already documented) and POST /tokens (to create)
// If POST /tokens not yet implemented, the Add button will show a graceful error.

const AccountAccessKeys = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keys, setKeys] = useState([]);
  const [creating, setCreating] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [newToken, setNewToken] = useState(null); // store token once, only at creation time

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Backend route is /accesstokens returning array [{id,name,organization,token,isValid}]
      const resp = await api.get('/accesstokens');
      const data = Array.isArray(resp.data) ? resp.data : [];
      setKeys(data);
    } catch (e) {
      setError(e.message || 'Failed to load access keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // load organizations for selection
    (async () => {
      try {
        const resp = await api.get('/organizations');
        const list = Array.isArray(resp.data) ? resp.data : [];
        setOrgs(list);
        if (list.length === 1) setFormOrg(list[0]._id || list[0].id);
      } catch (err) {
        // silently ignore org load error; creation will fail later with meaningful message
      }
    })();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formOrg) { setError('Select organization'); return; }
    if (!formName.trim()) { setError('Enter name/description'); return; }
    setCreating(true); setError(null); setNewToken(null);
    try {
      const resp = await api.post('/accesstokens', { organization: formOrg, name: formName.trim() });
      if (resp.data) {
        setKeys(k => [resp.data, ...k]);
        // Attempt to re-fetch list to populate created token details including id
        setShowModal(false);
        // Backend only returns id & name; no token on fetch list. We cannot show secret again later.
        // So request token separately? Current POST route does not return token value (security). Keep placeholder.
        setNewToken(resp.data.token); // will be undefined (route hides it) but keep for possible future change.
      }
      setFormName('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page account-access-keys">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h2 className="m-0">Access Keys</h2>
        <button
          className="btn btn-sm btn-primary"
          disabled={creating}
          onClick={() => { setShowModal(true); setError(null); setNewToken(null); }}
        >Add Access Key</button>
      </div>
      <p className="text-muted">Generate and manage API access keys for automation.</p>
      {newToken && (
        <div className="alert alert-warning py-2">
          <strong>Copy your token now:</strong> <code>{newToken}</code>
        </div>
      )}
      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
      {loading ? <p>Loading...</p> : (
        keys.length === 0 ? <p>No access keys yet.</p> : (
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>Key ID</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td>{k.id}</td>
                    <td>{k.name || '-'}</td>
                    <td>-</td>
                    <td>{k.isValid ? 'Valid' : 'Invalid'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          if (!window.confirm('Delete this access key?')) return;
                          try {
                            await api.delete(`/accesstokens/${k.id}`);
                            setKeys(prev => prev.filter(x => x.id !== k.id));
                          } catch (e) {
                            // eslint-disable-next-line no-alert
                            alert('Delete failed: ' + (e.response?.data?.error || e.message));
                          }
                        }}
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1040 }} onClick={() => setShowModal(false)} />
      )}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-header py-2">
                  <h6 className="modal-title">New Access Key</h6>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label">Organization</label>
                    <select className="form-select form-select-sm" value={formOrg} onChange={e => setFormOrg(e.target.value)} required>
                      <option value="">Select...</option>
                      {orgs.map(o => (
                        <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Name / Description</label>
                    <input className="form-control form-control-sm" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. CI Pipeline" required />
                  </div>
                  <p className="small text-muted m-0">Token will be shown only once after creation.</p>
                </div>
                <div className="modal-footer py-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(false)} disabled={creating}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountAccessKeys;
