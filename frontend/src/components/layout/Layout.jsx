import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

function UserAvatar({ user, size = 34 }) {
  const inits = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="user-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {inits}
    </div>
  );
}
export { UserAvatar };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [chatUnread,   setChatUnread]   = useState(0);

  // Poll unread count every 30s while not on the chat page
  const fetchUnread = useCallback(async () => {
    try {
      const r = await api.get('/chat/unread');
      setChatUnread(r.data.count || 0);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/dashboard',  icon: '◈', label: 'SCOREBOARD' },
    { to: '/picks',      icon: '◎', label: 'MY PICKS'   },
    { to: '/standings',  icon: '▲', label: 'STANDINGS'  },
    { to: '/rules',      icon: '◉', label: 'RULES'      },
    {
      to: '/chat', icon: '◉', label: 'LEAGUE CHAT',
      badge: chatUnread > 0 ? chatUnread : null,
      onActivate: () => setChatUnread(0),
    },
  ];

  return (
    <div className="app-layout">
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo-light.svg" alt="68 Ski-Doo" style={{ width: 116, height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">PLAY</div>
          {navItems.map(({ to, icon, label, badge, onActivate }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => { setMobileOpen(false); onActivate?.(); }}
            >
              <span className="nav-icon">{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge != null && (
                <span style={{
                  background: 'var(--red-pencil)', color: '#fff',
                  fontFamily: 'var(--font-scoreboard)', fontSize: 11, fontWeight: 700,
                  borderRadius: 10, padding: '1px 6px', lineHeight: 1.4,
                  minWidth: 18, textAlign: 'center',
                }}>{badge > 99 ? '99+' : badge}</span>
              )}
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
