import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CONFERENCES = {
  'SEC': ['Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 'LSU', 'Mississippi State', 'Missouri', 'Ole Miss', 'South Carolina', 'Tennessee', 'Texas A&M', 'Vanderbilt', 'Texas', 'Oklahoma'],
  'Big Ten': ['Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan', 'Michigan State', 'Minnesota', 'Nebraska', 'Northwestern', 'Ohio State', 'Penn State', 'Purdue', 'Rutgers', 'Wisconsin', 'UCLA', 'USC', 'Oregon', 'Washington'],
  'Big 12': ['Arizona', 'Arizona State', 'Baylor', 'BYU', 'Cincinnati', 'Colorado', 'Houston', 'Iowa State', 'Kansas', 'Kansas State', 'Oklahoma State', 'TCU', 'Texas Tech', 'UCF', 'Utah', 'West Virginia'],
  'ACC': ['Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 'Georgia Tech', 'Louisville', 'Miami', 'NC State', 'North Carolina', 'Pittsburgh', 'SMU', 'Stanford', 'Syracuse', 'Virginia', 'Virginia Tech', 'Wake Forest'],
  'Ind': ['Notre Dame'],
};

export default function TeamsRemaining() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'used'
  const usedSet = new Set(user?.usedTeams || []);

  const total = 68;
  const used = usedSet.size;
  const remaining = total - used;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">YOUR TEAMS</h1>
        <div className="page-subtitle">SEASON TEAM USAGE · EACH TEAM ONCE ONLY</div>
      </div>

      {/* Progress */}
      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: 'var(--green-pencil)' }}>{remaining}</div>
          <div className="stat-label">AVAILABLE</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{used}</div>
          <div className="stat-label">USED</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number">{total}</div>
          <div className="stat-label">TOTAL</div>
        </div>
      </div>

      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 20 }}>
        <div style={{
          height: 8, borderRadius: 4,
          width: `${(used / total) * 100}%`,
          background: used > 50 ? 'var(--red-pencil)' : used > 30 ? 'var(--amber)' : 'var(--amber-dim)',
          transition: 'width 0.5s',
        }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'ALL TEAMS' },
          { key: 'available', label: `AVAILABLE (${remaining})` },
          { key: 'used', label: `USED (${used})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn btn-sm ${filter === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: filter === key ? 'var(--amber)' : undefined, color: filter === key ? 'var(--amber)' : undefined }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Team grid by conference */}
      {Object.entries(CONFERENCES).map(([conf, teams]) => {
        const filtered = teams.filter(t => {
          if (filter === 'available') return !usedSet.has(t);
          if (filter === 'used') return usedSet.has(t);
          return true;
        });
        if (filtered.length === 0) return null;

        const confUsed = teams.filter(t => usedSet.has(t)).length;

        return (
          <div key={conf} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber-pencil)' }}>{conf}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
                {teams.length - confUsed}/{teams.length} LEFT
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(team => {
                const isUsed = usedSet.has(team);
                return (
                  <div key={team} style={{
                    padding: '10px 12px',
                    background: isUsed ? 'var(--green-deep)' : 'var(--elevated)',
                    border: '1px solid var(--amber-pencil)'}`,
                    borderRadius: 'var(--radius)',
                    opacity: isUsed ? 0.45 : 1,
                    position: 'relative',
                  }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: isUsed ? 'var(--cream-dim)' : 'var(--cream)' }}>
                      {team}
                    </div>
                    {isUsed && (
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--red-score)', letterSpacing: 1, marginTop: 2 }}>
                        USED
                      </div>
                    )}
                    {!isUsed && (
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-pencil)', letterSpacing: 1, marginTop: 2 }}>
                        AVAILABLE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
