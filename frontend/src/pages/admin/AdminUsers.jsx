import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/admin/users').then(r => setUsers(r.data.users || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const patch = async (id, updates, label) => {
    try {
      await api.patch(`/admin/users/${id}`, updates);
      setMsg({ text: `✓ ${label}`, type: 'success' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Update failed', type: 'error' });
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PLAYERS</h1>
        <div className="page-subtitle">{users.length} TOTAL · {users.filter(u => u.emailVerified).length} VERIFIED</div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="form-group" style={{ maxWidth: 320, marginBottom: 20 }}>
        <input
          className="form-input"
          placeholder="SEARCH PLAYERS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PLAYER</th>
              <th>EMAIL</th>
              <th>SEASON PTS</th>
              <th>TEAMS USED</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id} className={u._id === me?._id ? 'is-me' : ''}>
                <td>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-condensed)', fontSize: 15 }}>{u.displayName}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>@{u.username}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--cream-dim)' }}>{u.email}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber)' }}>{u.seasonPoints || 0}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{(u.usedTeams || []).length}/68</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className={`badge ${u.emailVerified ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                      {u.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                    <span className={`badge ${u.isActive ? 'badge-cream' : 'badge-gray'}`} style={{ fontSize: 9 }}>
                      {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {u.isAdmin && <span className="badge badge-amber" style={{ fontSize: 9 }}>ADMIN</span>}
                    <span className={`badge ${u.hasPaid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                      {u.hasPaid ? 'PAID' : 'UNPAID'}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => patch(u._id, { hasPaid: !u.hasPaid }, `${u.displayName} MARKED ${u.hasPaid ? 'UNPAID' : 'PAID'}`)}
                    >
                      {u.hasPaid ? 'MARK UNPAID' : 'MARK PAID'}
                    </button>
                    {u._id !== me?._id && (
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => patch(u._id, { isActive: !u.isActive }, `${u.displayName} ${u.isActive ? 'DEACTIVATED' : 'ACTIVATED'}`)}
                      >
                        {u.isActive ? 'DEACTIVATE' : 'REACTIVATE'}
                      </button>
                    )}
                    {!u.isAdmin && u._id !== me?._id && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (window.confirm(`Make ${u.displayName} an admin?`)) {
                            patch(u._id, { isAdmin: true }, `${u.displayName} IS NOW AN ADMIN`);
                          }
                        }}
                      >
                        MAKE ADMIN
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">👤</span>
          <p>NO PLAYERS FOUND</p>
        </div>
      )}
    </div>
  );
}
