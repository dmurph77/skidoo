import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from './Layout';

const adminNav = [
  { to: '/admin',         icon: '◈', label: 'OVERVIEW',    end: true },
  { to: '/admin/weeks',   icon: '◎', label: 'WEEKS'        },
  { to: '/admin/invites', icon: '✉', label: 'INVITES'      },
  { to: '/admin/users',   icon: '◉', label: 'PLAYERS'      },
  { to: '/admin/directions', icon: '?', label: 'PLAYBOOK' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);

  return (
    <div className="app-layout">
      {mobile && <div className="mobile-overlay" onClick={() => setMobile(false)} />}
      <button className="mobile-menu-btn" onClick={() => setMobile(o => !o)}>☰</button>

      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo-light.svg" alt="68 Ski-Doo" style={{ width: 140, height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">ADMIN</div>
          {adminNav.map(({ to, icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobile(false)}
            >
              <span className="nav-icon">{icon}</span>{label}
            </NavLink>
          ))}

          <div className="nav-section" style={{ marginTop: 16 }}>PLAYER VIEW</div>
          <NavLink to="/dashboard" className="nav-item" onClick={() => setMobile(false)}>
            <span className="nav-icon">↩</span>BACK TO SITE
          </NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <UserAvatar user={user} />
            <div className="user-card-info">
              <div className="user-card-name">{user?.displayName}</div>
              <div className="user-card-role" style={{ color: 'var(--red-score)' }}>COMMISSIONER</div>
            </div>
          </div>
          <button className="btn-signout" onClick={() => { logout(); navigate('/login'); }}>
            SIGN OUT
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
