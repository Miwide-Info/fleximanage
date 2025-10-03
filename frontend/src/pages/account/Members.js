import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

// Simple Members listing page. Fetches /members and displays basic columns.
// Reuses existing auth token + permissions guard applied at routing level.
export default function AccountMembers () {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [page, setPage] = useState(0); // zero-based
  const [pageSize, setPageSize] = useState(25);
  const [serverMeta, setServerMeta] = useState({ offset: 0, limit: 25, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Initialize with both states so界面明确显示“全部状态”而不是依赖空数组语义
  const [stateFilters, setStateFilters] = useState(['unverified', 'verified']); // ['unverified','verified'] means show all
  const [sort, setSort] = useState([]); // array of { key, dir } where dir is 'asc'|'desc'
  const [selectedIds, setSelectedIds] = useState([]); // user__id values
  const allSelected = rows.length > 0 && selectedIds.length === rows.map(r => r.user__id).filter((v, i, a) => a.indexOf(v) === i).length;

  // Debounce search input
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(h);
  }, [search]);

  const load = useCallback(async ({ page: p, pageSize: ps, q, states, sort: sortState }) => {
    setLoading(true); setError(null);
    try {
      const offset = p * ps;
      const params = { offset, limit: ps };
      if (q && q !== '') params.q = q;
      if (states && states.length > 0) params.state = states.join(',');
      if (sortState && sortState.length > 0) {
        const sortParam = sortState.map(s => (s.dir === 'desc' ? '-' : '') + s.key).join(',');
        if (sortParam) params.sort = sortParam;
      }
      const resp = await api.get('/members', { params });
      const data = resp.data;
      if (Array.isArray(data)) {
        // Pagination metadata now sent via headers when backend returns an array
        const totalHdr = resp.headers['x-total-count'];
        const offHdr = resp.headers['x-offset'];
        const limHdr = resp.headers['x-limit'];
        setRows(data);
        setServerMeta({
          offset: offHdr ? parseInt(offHdr, 10) : offset,
          limit: limHdr ? parseInt(limHdr, 10) : ps,
            total: totalHdr ? parseInt(totalHdr, 10) : (offset + data.length)
        });
      } else {
        // (Legacy/object mode)
        setRows(data.items || []);
        setServerMeta({ offset: data.offset || offset, limit: data.limit || ps, total: data.total ?? (offset + (data.items?.length || 0)) });
      }
    } catch (e) {
      setError(e.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ page, pageSize, q: debouncedSearch, states: stateFilters, sort });
  }, [load, page, pageSize, debouncedSearch, stateFilters, sort]);
  const toggleSort = (key) => {
    setPage(0);
    setSort(prev => {
      // simple single-column toggle for now
      const existing = prev.find(s => s.key === key);
      if (!existing) return [{ key, dir: 'asc' }];
      if (existing.dir === 'asc') return [{ key, dir: 'desc' }];
      return []; // remove sort on third click
    });
  };

  const sortIndicator = (key) => {
    const s = sort.find(x => x.key === key);
    if (!s) return null;
    return s.dir === 'asc' ? ' ▲' : ' ▼';
  };


  useEffect(() => {
    // Determine super admin from token (admin flag added to JWT payload)
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payloadB64 = token.split('.')[1];
      if (!payloadB64) return;
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(decodeURIComponent(escape(json)));
      setIsSuperAdmin(payload.admin === true);
    } catch (_) {}
  }, []);

  if (loading) return <div className="page account-members"><h3>Users</h3><p>Loading...</p></div>;
  if (error) return <div className="page account-members"><h3>Users</h3><p className="text-danger">{error}</p></div>;

  return (
    <div className="page account-members">
      <h3>Users</h3>
      <div className="d-flex gap-2 flex-wrap align-items-center mb-3">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search name / email / username / org / account"
          style={{ maxWidth: '340px' }}
          value={search}
          onChange={e => { setPage(0); setSearch(e.target.value); }}
        />
        {debouncedSearch && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearch(''); setPage(0); }}>Clear</button>
        )}
        <div className="small text-muted">Total: {serverMeta.total}</div>
      </div>
      <div className="d-flex gap-3 flex-wrap align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">State:</span>
          {['unverified', 'verified'].map(s => (
            <label key={s} className="form-check-label d-flex align-items-center gap-1" style={{ fontWeight: 'normal' }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={stateFilters.includes(s)}
                onChange={e => {
                  setPage(0);
                  setStateFilters(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s));
                }}
              /> {s}
            </label>
          ))}
          <div className="btn-group">
            <button
              type="button"
              className={`btn btn-sm ${stateFilters.length === 1 && stateFilters[0] === 'unverified' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => { setPage(0); setStateFilters(['unverified']); }}
            >Only Unverified</button>
            <button
              type="button"
              className={`btn btn-sm ${stateFilters.length === 1 && stateFilters[0] === 'verified' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => { setPage(0); setStateFilters(['verified']); }}
            >Only Verified</button>
            <button
              type="button"
              className={`btn btn-sm ${(stateFilters.includes('unverified') && stateFilters.includes('verified')) ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => { setPage(0); setStateFilters(['unverified', 'verified']); }}
            >All States</button>
          </div>
          {stateFilters.length > 0 && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => { setStateFilters([]); setPage(0); }}
            >Clear State</button>
          )}
        </div>
        {stateFilters.length > 0 && (
          <div className="small text-muted">Filtered: {stateFilters.join(', ')}</div>
        )}
      </div>
      {rows.length === 0 && !loading && <p>No users found.</p>}
      {rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                {isSuperAdmin && (
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(rows.map(r => r.user__id));
                        } else setSelectedIds([]);
                      }}
                    />
                  </th>
                )}
                <th role="button" onClick={() => toggleSort('name')}>First Name{sortIndicator('name')}</th>
                <th role="button" onClick={() => toggleSort('lastName')}>Last Name{sortIndicator('lastName')}</th>
                <th role="button" onClick={() => toggleSort('email')}>Email{sortIndicator('email')}</th>
                <th role="button" onClick={() => toggleSort('username')}>Username{sortIndicator('username')}</th>
                <th role="button" onClick={() => toggleSort('state')}>State{sortIndicator('state')}</th>
                <th role="button" onClick={() => toggleSort('jobTitle')}>Job Title{sortIndicator('jobTitle')}</th>
                <th role="button" onClick={() => toggleSort('phoneNumber')}>Phone{sortIndicator('phoneNumber')}</th>
                <th role="button" onClick={() => toggleSort('role')}>Role{sortIndicator('role')}</th>
                <th role="button" onClick={() => toggleSort('scope')}>Scope{sortIndicator('scope')}</th>
                <th role="button" onClick={() => toggleSort('organization')}>Organization{sortIndicator('organization')}</th>
                <th role="button" onClick={() => toggleSort('mfa')}>MFA</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const scope = r.to === 'account' ? 'Account' : (r.to === 'organization' ? 'Organization' : (r.to === 'group' ? 'Group' : r.to));
                return (
                  <tr key={r._id} className={r.user_state === 'unverified' ? 'table-warning' : ''}>
                    {isSuperAdmin && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.user__id)}
                          onChange={e => {
                            setSelectedIds(prev => e.target.checked
                              ? [...prev, r.user__id]
                              : prev.filter(id => id !== r.user__id));
                          }}
                        />
                      </td>
                    )}
                    <td>{r.user_name || '-'}</td>
                    <td>{r.user_lastName || '-'}</td>
                    <td>
                      {r.user_email || '-'}
                      {r.user_admin === true && (
                        <span className="badge bg-danger ms-1">ADMIN</span>
                      )}
                    </td>
                    <td>{r.user_username || '-'}</td>
                    <td>{r.user_state || '-'}</td>
                    <td>{r.user_jobTitle || '-'}</td>
                    <td>{r.user_phoneNumber || '-'}</td>
                    <td>{r.role || '-'}</td>
                    <td>{scope}</td>
                    <td>{r.organization_name || (r.to === 'account' ? '-' : '')}</td>
                    <td>{r['user.mfa.enabled'] ? 'Yes' : 'No'}</td>
                    {isSuperAdmin && (
                      <td>
                        <div className="d-flex flex-column gap-1">
                          {r.user_state === 'unverified' && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={async () => {
                                try {
                                  await api.post(`/users/${r.user__id}/verify`);
                                  window.location.reload();
                                } catch (e) {
                                  // eslint-disable-next-line no-alert
                                  alert('Verify failed: ' + (e.message || 'error'));
                                }
                              }}
                            >Approve</button>
                          )}
                          {r.user_admin === true ? (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={async () => {
                                if (!window.confirm('Demote this admin user?')) return;
                                try {
                                  await api.delete(`/users/${r.user__id}/admin`);
                                  window.location.reload();
                                } catch (e) {
                                  // eslint-disable-next-line no-alert
                                  alert('Demote failed: ' + (e.message || 'error'));
                                }
                              }}
                            >Demote</button>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={async () => {
                                try {
                                  await api.put(`/users/${r.user__id}/admin`);
                                  window.location.reload();
                                } catch (e) {
                                  // eslint-disable-next-line no-alert
                                  alert('Promote failed: ' + (e.message || 'error'));
                                }
                              }}
                            >Promote Admin</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {isSuperAdmin && selectedIds.length > 0 && (
        <div className="alert alert-secondary py-2 d-flex flex-wrap align-items-center gap-2 mt-2">
          <span className="small">Selected {selectedIds.length} user(s)</span>
          <button
            className="btn btn-sm btn-outline-success"
            onClick={async () => {
              try {
                await api.post('/users/verify/batch', { ids: selectedIds });
                setSelectedIds([]);
                load({ page, pageSize, q: debouncedSearch, states: stateFilters, sort });
              } catch (e) {
                // eslint-disable-next-line no-alert
                alert('Batch verify failed: ' + (e.message || 'error'));
              }
            }}
          >Batch Verify</button>
          <button
            className="btn btn-sm btn-outline-warning"
            onClick={async () => {
              try {
                await api.post('/users/admin/batch', { promote: selectedIds });
                setSelectedIds([]);
                load({ page, pageSize, q: debouncedSearch, states: stateFilters, sort });
              } catch (e) {
                // eslint-disable-next-line no-alert
                alert('Batch promote failed: ' + (e.message || 'error'));
              }
            }}
          >Batch Promote Admin</button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={async () => {
              if (!window.confirm('Demote selected admins (non-admins ignored)?')) return;
              try {
                await api.post('/users/admin/batch', { demote: selectedIds });
                setSelectedIds([]);
                load({ page, pageSize, q: debouncedSearch, states: stateFilters, sort });
              } catch (e) {
                // eslint-disable-next-line no-alert
                alert('Batch demote failed: ' + (e.message || 'error'));
              }
            }}
          >Batch Demote Admin</button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setSelectedIds([])}
          >Clear Selection</button>
        </div>
      )}
  <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
        <div className="d-flex align-items-center gap-2">
          <label className="form-label m-0">Page Size</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '90px' }}
            value={pageSize}
            onChange={e => { setPage(0); setPageSize(parseInt(e.target.value, 10)); }}
          >
            {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => { setPage(0); setPageSize(100); }}
          disabled={pageSize === 100}
        >Show 100</button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => { setPage(0); setPageSize(25); }}
          disabled={pageSize === 25}
        >Default 25</button>
        <div className="btn-group">
          <button className="btn btn-sm btn-outline-secondary" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={loading || (serverMeta.offset + rows.length) >= serverMeta.total}
            onClick={() => setPage(p => p + 1)}
          >Next</button>
        </div>
        <div className="small text-muted">
          Offset: {serverMeta.offset} • Limit: {serverMeta.limit} • Showing {rows.length} • Page {page + 1}{serverMeta.total ? ` / ${Math.ceil(serverMeta.total / serverMeta.limit)}` : ''}
        </div>
      </div>
    </div>
  );
}
