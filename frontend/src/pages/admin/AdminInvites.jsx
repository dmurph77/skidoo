import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', expiresInDays: 7 });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [newInvite, setNewInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    api.get('/admin/invites').then(r => setInvites(r.data.invites || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true); setMsg({ text: '', type: '' }); setNewInvite(null);
    try {
      const r = await api.post('/admin/invites', form);
      setNewInvite(r.data);
      setMsg({ text: form.email ? `✓ INVITE SENT TO ${form.email}` : '✓ INVITE LINK CREATED', type: 'success' });
      setForm({ email: '', expiresInDays: 7 });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to create invite', type: 'error' });
    } finally { setCreating(false); }
  };

  const copy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this invite?')) return;
    await api.delete(`/admin/invites/${id}`);
    load();
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  const active = invites.filter(i => !i.isUsed && new Date(i.expiresAt) > new Date());
  const used = invites.filter(i => i.isUsed);
  const expired = invites.filter(i => !i.isUsed && new Date(i.expiresAt) <= new Date());

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">INVITES</h1>
        <div className="page-subtitle">MANAGE INVITE LINKS · {active.length} ACTIVE</div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* New invite URL display */}
      {newInvite && (
        <div className="score-card gold" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, color: 'var(--amber)', marginBottom: 10 }}>
            NEW INVITE LINK
          </div>
          <div style={{
            background: 'var(--green-deep)', border: '1px solid var(--amber-dim)',
            padding: '12px 16px', borderRadius: 'var(--radius)', fontFamily: 'var(--font-scoreboard)',
            fontSize: 15, color: 'var(--text-primary)', wordBreak: 'break-all', letterSpacing: 0.5, marginBottom: 10
          }}>
            {newInvite.inviteUrl}
          </div>
          <button className="btn btn-primary" onClick={() => copy(newInvite.inviteUrl)}>
            {copied ? '✓ COPIED!' : 'COPY LINK'}
          </button>
        </div>
      )}

      {/* Create invite form */}
      <div className="score-card" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 16 }}>CREATE INVITE</div>
        <form onSubmit={create}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">EMAIL (OPTIONAL)</label>
              <input
                className="form-input"
                type="email"
                placeholder="player@example.com — leave blank for generic link"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, width: 120 }}>
              <label className="form-label">EXPIRES (DAYS)</label>
              <select className="form-input" value={form.expiresInDays} onChange={e => setForm(f => ({ ...f, expiresInDays: parseInt(e.target.value) }))}>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? 'CREATING...' : 'CREATE →'}
            </button>
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1, marginTop: 8 }}>
            IF EMAIL IS PROVIDED, AN INVITE EMAIL IS SENT AUTOMATICALLY. OTHERWISE, COPY THE LINK AND SHARE MANUALLY.
          </div>
        </form>
      </div>

      {/* Active invites */}
      {active.length > 0 && (
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 14 }}>ACTIVE INVITES</div>
          {active.map(inv => (
            <div key={inv._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700 }}>{inv.email || 'OPEN INVITE'}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
                  EXPIRES {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} · CREATED BY {inv.createdBy?.displayName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copy(`${window.location.origin}/register?invite=${inv.token}`)}
                >
                  COPY LINK
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => revoke(inv._id)}>REVOKE</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Used invites */}
      {used.length > 0 && (
        <div className="score-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 14, color: 'var(--text-muted)' }}>USED INVITES</div>
          {used.map(inv => (
            <div key={inv._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="badge badge-green" style={{ fontSize: 13 }}>USED</span>
              <div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13 }}>{inv.email || 'Open invite'}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
                  REGISTERED AS: {inv.usedBy?.displayName || 'Unknown'} (@{inv.usedBy?.username})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {invites.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">✉</span>
          <p>NO INVITES CREATED YET</p>
        </div>
      )}
    </div>
  );
}
