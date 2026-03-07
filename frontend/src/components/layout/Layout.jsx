import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard',   icon: '◈', label: 'SCOREBOARD' },
  { to: '/picks',       icon: '◎', label: 'MY PICKS'   },
  { to: '/leaderboard', icon: '▲', label: 'STANDINGS'  },
  { to: '/teams',       icon: '⊞', label: 'TEAMS'      },
  { to: '/history',     icon: '◷', label: 'HISTORY'    },
  { to: '/rules',       icon: '◉', label: 'RULES'      },
];

function UserAvatar({ user, size = 34 }) {
  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="user-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.displayName} /> : initials}
    </div>
  );
}

export { UserAvatar };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-name">68 SKI-DOO</span>
          <span className="brand-year">2026 SEASON</span>
          <span className="brand-tagline">COLLEGE FOOTBALL PICK'EM</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">PLAY</div>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}

          {user?.isAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 16 }}>COMMISSIONER</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">⚙</span>ADMIN PANEL
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <NavLink to="/profile" className="user-card" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setMobileOpen(false)}>
            <UserAvatar user={user} />
            <div className="user-card-info">
              <div className="user-card-name">{user?.displayName}</div>
              <div className="user-card-role">{user?.isAdmin ? 'COMMISSIONER' : 'SKI-DOOZER'}</div>
            </div>
          </NavLink>
          <button className="btn-signout" onClick={handleLogout}>SIGN OUT</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
