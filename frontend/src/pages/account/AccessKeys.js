import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../../styles/unified-table.css';

// Access Keys management: creates scoped access keys with role-based permissions.
// Backend (OpenAPI) expects AccessTokenRequest: {
//   name, accessKeyPermissionTo (account|group|organization), accessKeyEntity, accessKeyRole (owner|manager|viewer), validityEntity
// }

const AccountAccessKeys = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keys, setKeys] = useState([]);
  const [creating, setCreating] = useState(false);
  const [orgs, setOrgs] = useState([]); // organizations list
  const [groups, setGroups] = useState([]); // derived group names
  const [formName, setFormName] = useState('');
  const [permissionTo, setPermissionTo] = useState('account');
  const [entity, setEntity] = useState(''); // holds account id, group name, or org id
  const [role, setRole] = useState('owner');
  const [validity, setValidity] = useState('Default'); // placeholder for future validity options
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  // Decode token to get accountName (payload.accountName)
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payloadB64 = token.split('.')[1];
        const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const p = JSON.parse(decodeURIComponent(escape(json)));
        if (p.accountName) setAccountName(p.accountName);
        if (p.account) setAccountId(p.account);
      }
    } catch (_) { /* ignore decode errors */ }
  }, []);

  const loadKeys = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await api.get('/accesstokens');
      const list = Array.isArray(resp.data) ? resp.data : [];
      // Normalise: service returns _id vs legacy id
      const mapped = list.map(r => ({
        id: r._id || r.id,
        name: r.name,
        token: r.token,
        to: r.to,
        role: r.role,
        group: r.group,
        organization: r.organization,
        isValid: r.isValid
      }));
      setKeys(mapped);
      setPage(0); // reset page on reload
    } catch (e) {
      setError(e.message || 'Failed to load access keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
    (async () => {
      try {
        const resp = await api.get('/organizations');
        const list = Array.isArray(resp.data) ? resp.data : [];
        setOrgs(list);
        const uniqueGroups = Array.from(new Set(list.map(o => o.group))).filter(Boolean).sort();
        setGroups(uniqueGroups);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // Recompute default entity whenever permissionTo or orgs/groups/account changes
  useEffect(() => {
    if (permissionTo === 'account') {
      setEntity(accountId || '');
      setRole(r => ['owner', 'manager', 'viewer'].includes(r) ? r : 'owner');
    } else if (permissionTo === 'group') {
      setEntity(prev => groups.includes(prev) ? prev : (groups[0] || ''));
      setRole(r => ['manager', 'viewer'].includes(r) ? r : 'manager');
    } else if (permissionTo === 'organization') {
      setEntity(prev => (orgs.some(o => (o._id || o.id) === prev) ? prev : (orgs[0]?._id || orgs[0]?.id || '')));
      setRole(r => ['manager', 'viewer'].includes(r) ? r : 'manager');
    }
  }, [permissionTo, accountId, orgs, groups]);

  const availableRoles = useMemo(() => {
    if (permissionTo === 'account') return ['owner', 'manager', 'viewer'];
    return ['manager', 'viewer'];
  }, [permissionTo]);

  const entityLabel = useMemo(() => {
    switch (permissionTo) {
      case 'account': return accountName || '-';
      case 'group': return entity || '-';
      case 'organization': {
        const org = orgs.find(o => (o._id || o.id) === entity);
        return org?.name || '-';
      }
      default: return '-';
    }
  }, [permissionTo, entity, orgs, accountName]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { setError('Name is required'); return; }
    if (!permissionTo) { setError('Permission scope required'); return; }
    if (!entity) { setError('Entity required'); return; }
    if (!role) { setError('Role required'); return; }
    setCreating(true); setError(null); setNewToken(null);
    try {
      const payload = {
        name: formName.trim(),
        accessKeyPermissionTo: permissionTo,
        accessKeyEntity: entity,
        accessKeyRole: role,
        validityEntity: validity
      };
      const resp = await api.post('/accesstokens', payload);
      if (resp.data) {
        const rec = resp.data;
        setNewToken(rec.token);
        // Insert optimistic row (GET again if we want full list fields)
        setKeys(prev => [{
          id: rec._id || rec.id,
          name: rec.name,
          token: rec.token,
          to: permissionTo,
            role: role,
          group: permissionTo === 'group' ? entity : '',
          organization: permissionTo === 'organization' ? (orgs.find(o => (o._id || o.id) === entity)?.name || '') : null,
          isValid: true
        }, ...prev]);
        setPage(0);
      }
    } catch (ePost) {
      setError(ePost.response?.data?.error || ePost.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page account-access-keys">
      <h2 className="mb-3">Access Keys</h2>
      <form className="border rounded p-3 mb-4 bg-light" onSubmit={handleAdd}>
        <h6 className="fw-bold mb-3">Add Access Key</h6>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label mb-1">Name</label>
            <input className="form-control form-control-sm" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. CI Pipeline" required disabled={creating} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Permission To</label>
            <select className="form-select form-select-sm" value={permissionTo} onChange={e => setPermissionTo(e.target.value)} disabled={creating}>
              <option value="account">Account</option>
              <option value="group">Group</option>
              <option value="organization">Organization</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Entity</label>
            {permissionTo === 'account' && (
              <input className="form-control form-control-sm" value={entityLabel} disabled readOnly />
            )}
            {permissionTo === 'group' && (
              <select className="form-select form-select-sm" value={entity} onChange={e => setEntity(e.target.value)} disabled={creating || groups.length === 0}>
                {groups.length === 0 && <option value="">No Groups</option>}
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {permissionTo === 'organization' && (
              <select className="form-select form-select-sm" value={entity} onChange={e => setEntity(e.target.value)} disabled={creating || orgs.length === 0}>
                {orgs.length === 0 && <option value="">No Orgs</option>}
                {orgs.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
              </select>
            )}
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label mb-1">Role</label>
            <select className="form-select form-select-sm" value={role} onChange={e => setRole(e.target.value)} disabled={creating}>
              {availableRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label mb-1">Validity</label>
            <select className="form-select form-select-sm" value={validity} onChange={e => setValidity(e.target.value)} disabled>
              <option value="Default">Default</option>
            </select>
          </div>
          <div className="col-12 col-md-2 d-grid">
            <button className="btn btn-primary btn-sm" type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add'}</button>
          </div>
        </div>
        <p className="small text-muted mt-2 mb-0">Token will be shown only once after creation. Store it securely.</p>
        {error && <div className="alert alert-danger py-2 px-2 mt-3 mb-0">{error}</div>}
        {newToken && (
          <div className="alert alert-warning py-2 px-2 mt-3 mb-0">
            <strong>Copy your token now:</strong> <code>{newToken}</code>
          </div>
        )}
      </form>

      <p className="text-muted mb-2">Existing keys</p>
      {loading ? <p>Loading...</p> : (
        keys.length === 0 ? <p className="text-muted">No access keys yet.</p> : (
          <div className="unified-table-container">
            <div className="unified-table-header">
              <h5>Access Keys</h5>
            </div>
            <div className="unified-table-responsive">
              <table className="unified-table table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ minWidth: 120 }}>Name</th>
                    <th style={{ minWidth: 260 }}>Key</th>
                    <th>To</th>
                    <th>Entity</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {keys.slice(page * pageSize, page * pageSize + pageSize).map(k => {
                  const entityDisplay = k.to === 'account'
                    ? accountName
                    : (k.to === 'group' ? k.group : (k.organization || '-'));
                  return (
                    <tr key={k.id}>
                      <td className="text-break" style={{ maxWidth: 180 }}>{k.name || '-'}</td>
                      <td className="font-monospace" style={{ wordBreak: 'break-all', maxWidth: 360 }}>
                        {k.token || <span className="text-muted">(hidden)</span>}
                      </td>
                      <td>{k.to}</td>
                      <td>{entityDisplay || '-'}</td>
                      <td>{k.role || '-'}</td>
                      <td>{k.isValid ? 'Active' : 'Inactive'}</td>
                      <td className="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={!k.token}
                          onClick={() => {
                            if (!k.token) return;
                            try { navigator.clipboard.writeText(k.token); } catch (_) {}
                          }}
                        >Copy</button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={async () => {
                            if (!window.confirm('Delete this access key?')) return;
                            try {
                              await api.delete(`/accesstokens/${k.id}`);
                              setKeys(prev => prev.filter(x => x.id !== k.id));
                            } catch (eDel) {
                              // eslint-disable-next-line no-alert
                              alert('Delete failed: ' + (eDel.response?.data?.error || eDel.message));
                            }
                          }}
                          disabled={creating}
                        >Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {/* Pagination Footer */}
            <div className="unified-table-footer">
              <div className="pagination-info">
                {(() => {
                  const total = keys.length;
                  const start = total === 0 ? 0 : page * pageSize + 1;
                  const end = Math.min(total, page * pageSize + pageSize);
                  return `Showing ${start} to ${end} of ${total} Results`;
                })()}
              </div>
              <div className="pagination-controls">
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Back</button>
                <span className="px-2 fw-bold">{page}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={(page + 1) * pageSize >= keys.length} onClick={() => setPage(p => ((p + 1) * pageSize < keys.length ? p + 1 : p))}>Next</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={(page + 1) * pageSize >= keys.length} onClick={() => setPage(Math.max(0, Math.ceil(keys.length / pageSize) - 1))}>Last</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default AccountAccessKeys;
