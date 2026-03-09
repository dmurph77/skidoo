import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [emailModal, setEmailModal] = useState(null); // { id, displayName, currentEmail }
  const [newEmail, setNewEmail] = useState('');

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

  const resetEmail = async () => {
    if (!emailModal || !newEmail) return;
    try {
      await api.patch(`/admin/users/${emailModal.id}/email`, { email: newEmail });
      setMsg({ text: `✓ EMAIL UPDATED FOR ${emailModal.displayName}. THEY WILL NEED TO REVERIFY.`, type: 'success' });
      setEmailModal(null);
      setNewEmail('');
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Email update failed', type: 'error' });
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
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>@{u.username}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--cream-dim)' }}>{u.email}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber)' }}>{u.seasonPoints || 0}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{(u.usedTeams || []).length}/68</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className={`badge ${u.emailVerified ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 13 }}>
                      {u.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                    <span className={`badge ${u.isActive ? 'badge-cream' : 'badge-gray'}`} style={{ fontSize: 13 }}>
                      {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {u.isAdmin && <span className="badge badge-amber" style={{ fontSize: 13 }}>ADMIN</span>}
                    <span className={`badge ${u.hasPaid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 13 }}>
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
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEmailModal({ id: u._id, displayName: u.displayName, currentEmail: u.email }); setNewEmail(''); }}
                    >
                      RESET EMAIL
                    </button>
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

      {/* Email Reset Modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="score-card" style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 4 }}>RESET EMAIL</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 4 }}>
              {emailModal.displayName.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 16 }}>
              CURRENT: {emailModal.currentEmail}
            </div>
            <div className="form-group">
              <label className="form-label">NEW EMAIL ADDRESS</label>
              <input className="form-input" type="email" placeholder="new@example.com"
                value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber)', letterSpacing: 1, marginBottom: 12 }}>
              ⚠ PLAYER WILL NEED TO REVERIFY THEIR NEW EMAIL
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={resetEmail} disabled={!newEmail}>SAVE EMAIL</button>
              <button className="btn btn-ghost" onClick={() => setEmailModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}