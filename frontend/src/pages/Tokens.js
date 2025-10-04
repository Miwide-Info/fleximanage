import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import '../styles/unified-table.css';

// Tokens page (Inventory > Tokens)
// Backend endpoints (as per OpenAPI / TokensService):
// GET    /tokens              -> list tokens
// POST   /tokens              -> create token { name, server? }
// DELETE /tokens/{id}         -> delete token
// GET    /tokens/{id}         -> fetch one (not used here)
// PUT    /tokens/{id}         -> update (not implemented here)
// Notes:
//  - server is optional; backend will choose first configured server if omitted
//  - name must be unique per organization (enforced server-side)
//  - returned fields: _id, name, token, createdAt (ISO string)

const PAGE_SIZE = 10;

const Tokens = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [server, setServer] = useState('');
  const [newTokenValue, setNewTokenValue] = useState(null); // show newly created token once
  const [page, setPage] = useState(0);

  // We'll build server options dynamically from existing tokens so user can re-use values; backend doesn't expose config list directly.
  const serverOptions = useMemo(() => {
    const set = new Set();
    tokens.forEach(t => { if (t.server) set.add(t.server); });
    return Array.from(set).sort();
  }, [tokens]);

  const loadTokens = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await api.get(`/tokens?_t=${Date.now()}`);
      const list = Array.isArray(resp.data) ? resp.data : [];
      const mapped = list.map(r => ({
        id: r._id || r.id,
        name: r.name,
        token: r.token,
        createdAt: r.createdAt,
        server: r.server // may be undefined if not stored; fine
      }));
      setTokens(mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setPage(0);
    } catch (e) {
      setError(e.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTokens(); }, []);

  const resetForm = () => {
    setName('');
    setServer('');
    setCreating(false);
    setNewTokenValue(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setCreating(true); setError(null); setNewTokenValue(null);
    try {
      const payload = { name: name.trim() };
      if (server.trim()) payload.server = server.trim();
      const resp = await api.post('/tokens', payload);
      if (resp.data) {
        const rec = resp.data;
        setNewTokenValue(rec.token); // show one-time
        setTokens(prev => [{
          id: rec._id || rec.id,
          name: rec.name,
          token: rec.token,
          createdAt: rec.createdAt,
          server: payload.server || ''
        }, ...prev]);
        setPage(0);
        setName('');
        setServer('');
      }
    } catch (ePost) {
      setError(ePost.response?.data?.error || ePost.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this token?')) return;
    try {
      await api.delete(`/tokens/${id}`);
      setTokens(prev => prev.filter(t => t.id !== id));
    } catch (eDel) {
      // eslint-disable-next-line no-alert
      alert('Delete failed: ' + (eDel.response?.data?.error || eDel.message));
    }
  };

  const paginated = tokens.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const total = tokens.length;
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="page tokens-page">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <h2 className="mb-0">Tokens</h2>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => { setFormOpen(o => !o); resetForm(); }}
            disabled={creating}
          >{formOpen ? 'Close' : 'New Token'}</button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadTokens()}
            disabled={loading || creating}
          >Refresh</button>
        </div>
      </div>

      {formOpen && (
        <form className="border rounded p-3 mb-4 bg-light" onSubmit={handleCreate}>
          <h6 className="fw-bold mb-3">Create Token</h6>
          <div className="row g-3">
            <div className="col-12 col-lg-3">
              <label className="form-label mb-1">Name</label>
              <input 
                className="form-control form-control-sm" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. device-onboarding" 
                disabled={creating} 
                required 
              />
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label mb-1">Server (optional)</label>
              <div className="input-group input-group-sm">
                <select 
                  className="form-select" 
                  value={server} 
                  onChange={e => setServer(e.target.value)} 
                  disabled={creating}
                >
                  <option value="">(default)</option>
                  {serverOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Custom server URL"
                  value={server}
                  onChange={e => setServer(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="form-text">Leave blank to use default backend server.</div>
            </div>
            <div className="col-12 col-lg-3">
              <label className="form-label mb-1">&nbsp;</label>
              <button 
                className="btn btn-primary btn-sm w-100" 
                type="submit" 
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-12">
              <p className="small text-muted mb-0">Token will be shown only once after creation. Store it securely.</p>
            </div>
          </div>
          {error && <div className="alert alert-danger py-2 px-2 mt-3 mb-0">{error}</div>}
          {newTokenValue && (
            <div className="alert alert-warning py-2 px-2 mt-3 mb-0">
              <strong>Copy your token now:</strong> <code>{newTokenValue}</code>
            </div>
          )}
        </form>
      )}

      {loading ? <p>Loading…</p> : (
        tokens.length === 0 ? <p className="text-muted">No tokens yet.</p> : (
          <div className="unified-table-container">
            <div className="unified-table-header">
              <h5>Access Tokens</h5>
            </div>
            <div className="unified-table-responsive">
              <table className="unified-table table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Name</th>
                    <th style={{ minWidth: 320 }}>Token</th>
                    <th style={{ minWidth: 180 }}>Server</th>
                    <th style={{ minWidth: 180 }}>Created At</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {paginated.map(t => (
                  <tr key={t.id}>
                    <td className="text-break" style={{ maxWidth: 200 }}>{t.name || '-'}</td>
                    <td className="font-monospace" style={{ wordBreak: 'break-all', maxWidth: 400 }}>{t.token || <span className="text-muted">(hidden)</span>}</td>
                    <td>{t.server || '-'}</td>
                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleString(undefined, { hour12: false }) : '-'}</td>
                    <td className="d-flex flex-wrap gap-1">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={!t.token}
                          onClick={() => { if (t.token) { try { navigator.clipboard.writeText(t.token); } catch (_) {} } }}
                        >Copy</button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(t.id)}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="unified-table-footer">
              <div className="pagination-info">Showing {start} to {end} of {total} Results</div>
              <div className="pagination-controls">
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Back</button>
                <span className="px-2 fw-bold">{page}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => ((p + 1) * PAGE_SIZE < total ? p + 1 : p))}>Next</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1))}>Last</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Tokens;
