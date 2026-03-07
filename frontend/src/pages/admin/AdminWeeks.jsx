import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const PICKS_PER_WEEK = { 1: 4, 2: 4 };
const getRequired = (w) => PICKS_PER_WEEK[w] || 5;

function getSeasonFridays(season) {
  // Friday noon deadlines — one day after the Thursday game opener each week
  const WEEK1_THURSDAY = {
    2025: new Date('2025-08-28T17:00:00Z'),
    2026: new Date('2026-08-27T17:00:00Z'),
  };
  const start = WEEK1_THURSDAY[season] || WEEK1_THURSDAY[2026];
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7 + 1); // +1 day = Friday
    d.setHours(17, 0, 0, 0); // 17:00 UTC = noon ET (CDT offset)
    return d;
  });
}

function toDatetimeLocal(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminWeeks() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [season, setSeason] = useState(parseInt(import.meta.env.VITE_SEASON || '2025'));

  const load = () => {
    api.get('/admin/weeks').then(r => {
      setWeeks(r.data.weeks || []);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openEdit = (weekNum) => {
    const existing = weeks.find(w => w.week === weekNum);
    const fridays = getSeasonFridays(season);
    setForm({
      week: weekNum,
      label: existing?.label || (weekNum === 1 ? 'Week 0/1' : `Week ${weekNum}`),
      deadline: existing?.deadline
        ? toDatetimeLocal(new Date(existing.deadline))
        : toDatetimeLocal(fridays[weekNum - 1]),
      picksRequired: getRequired(weekNum),
    });
    setEditing(weekNum);
  };

  const save = async () => {
    if (!form.deadline) return setMsg({ text: 'DEADLINE IS REQUIRED', type: 'error' });
    setSaving(true);
    try {
      await api.post('/admin/weeks', form);
      setMsg({ text: `✓ WEEK ${form.week === 1 ? '0/1' : form.week} SAVED`, type: 'success' });
      setEditing(null);
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  const bulkSetup = async () => {
    if (!window.confirm(`Auto-configure all 14 weeks with Friday noon deadlines for ${season}?`)) return;
    setBulkSaving(true);
    const fridays = getSeasonFridays(season);
    try {
      for (let w = 1; w <= 14; w++) {
        const existing = weeks.find(wk => wk.week === w);
        if (existing?.isOpen || existing?.isScored) continue;
        await api.post('/admin/weeks', {
          week: w,
          label: w === 1 ? 'Week 0/1' : `Week ${w}`,
          deadline: fridays[w - 1].toISOString(),
          picksRequired: getRequired(w),
        });
      }
      setMsg({ text: '✓ ALL 14 WEEKS CONFIGURED WITH THURSDAY DEADLINES', type: 'success' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Bulk setup failed', type: 'error' });
    } finally { setBulkSaving(false); }
  };

  const openWeek = async (weekNum) => {
    if (!window.confirm(`Open Week ${weekNum === 1 ? '0/1' : weekNum}? This will email all players.`)) return;
    try {
      const r = await api.post(`/admin/weeks/${weekNum}/open`);
      setMsg({ text: `✓ WEEK ${weekNum === 1 ? '0/1' : weekNum} OPENED — ${r.data.emailsSent} EMAILS SENT`, type: 'success' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to open week', type: 'error' });
    }
  };

  const closeWeek = async (weekNum) => {
    if (!window.confirm(`Close Week ${weekNum === 1 ? '0/1' : weekNum}?`)) return;
    try {
      await api.post(`/admin/weeks/${weekNum}/close`);
      setMsg({ text: `✓ WEEK ${weekNum === 1 ? '0/1' : weekNum} CLOSED`, type: 'success' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed', type: 'error' });
    }
  };

  if (loading) return <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">MANAGE WEEKS</h1>
        <div className="page-subtitle">SET DEADLINES · OPEN/CLOSE PICKS · 14 WEEKS TOTAL</div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Bulk setup */}
      <div className="score-card gold" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--amber)' }}>QUICK SETUP</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--cream-dim)', marginTop: 4, letterSpacing: 1 }}>
              AUTO-CONFIGURE ALL 14 WEEKS WITH FRIDAY NOON DEADLINES
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select className="form-input" style={{ width: 100 }} value={season} onChange={e => setSeason(parseInt(e.target.value))}>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <button className="btn btn-primary" onClick={bulkSetup} disabled={bulkSaving}>
              {bulkSaving ? 'SETTING UP...' : 'AUTO-SETUP ALL →'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing !== null && (
        <div className="score-card" style={{ marginBottom: 20, borderColor: 'var(--amber-dim)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--amber)', marginBottom: 16 }}>
            EDITING WEEK {form.week === 1 ? '0/1' : form.week}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">LABEL</label>
              <input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">PICKS REQUIRED</label>
              <input className="form-input" type="number" value={form.picksRequired} readOnly />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">DEADLINE (THURSDAY NOON)</label>
            <input className="form-input" type="datetime-local" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'SAVING...' : 'SAVE →'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>CANCEL</button>
          </div>
        </div>
      )}

      {Array.from({ length: 14 }, (_, i) => i + 1).map(weekNum => {
        const w = weeks.find(wk => wk.week === weekNum);
        const label = weekNum === 1 ? '0/1' : `${weekNum}`;
        return (
          <div key={weekNum} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
            background: 'var(--card)',
            border: `1px solid ${w?.isOpen ? 'var(--amber-dim)' : w?.isScored ? '#2a7a4a' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', marginBottom: 8, flexWrap: 'wrap'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', width: 52, flexShrink: 0, textAlign: 'center' }}>{label}</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{w?.label || `Week ${label}`}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                {w?.deadline
                  ? `DEADLINE: ${new Date(w.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`
                  : 'NOT CONFIGURED'} · {getRequired(weekNum)} PICKS
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {w?.isOpen && <span className="badge badge-amber">OPEN</span>}
              {w?.isScored && <span className="badge badge-green">SCORED</span>}
              {!w && <span className="badge badge-gray">UNCONFIGURED</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(weekNum)}>EDIT</button>
              {w && !w.isOpen && !w.isScored && <button className="btn btn-outline btn-sm" onClick={() => openWeek(weekNum)}>OPEN</button>}
              {w?.isOpen && <button className="btn btn-danger btn-sm" onClick={() => closeWeek(weekNum)}>CLOSE</button>}
              {w && <Link to={`/admin/scoring/${weekNum}`} className="btn btn-ghost btn-sm">SCORE</Link>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
