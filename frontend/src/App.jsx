import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';

// Public
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PublicLeaderboard from './pages/PublicLeaderboard';
import HowToPlay from './pages/HowToPlay';

// Player
import Dashboard  from './pages/Dashboard';
import SubmitPicks from './pages/SubmitPicks';
import Standings  from './pages/Standings';
import ChatPage   from './pages/ChatPage';
import Rules      from './pages/Rules';
import Profile    from './pages/Profile';
import HeadToHead from './pages/HeadToHead';

// Admin
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminScoring    from './pages/admin/AdminScoring';
import AdminWeeks      from './pages/admin/AdminWeeks';
import AdminUsers      from './pages/admin/AdminUsers';
import AdminInvites    from './pages/admin/AdminInvites';
import AdminDirections from './pages/admin/AdminDirections';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="logo-flash">68 SKI-DOO</div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--green-text)', fontSize: 12, letterSpacing: 3 }}>
        LOADING...
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public — must come before the catch-all PrivateRoute */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email"    element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/leaderboard"     element={<PublicLeaderboard />} />
      <Route path="/how-to-play"     element={<HowToPlay />} />

      {/* Player app */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="picks"        element={<SubmitPicks />} />
        <Route path="picks/:week"  element={<SubmitPicks />} />
        <Route path="standings"    element={<Standings />} />
        <Route path="chat"         element={<ChatPage />} />
        <Route path="h2h/:userId"  element={<HeadToHead />} />
        <Route path="rules"        element={<Rules />} />
        <Route path="profile"      element={<Profile />} />

        {/* Legacy redirects — keep old deep-links working */}
        <Route path="explore"      element={<Navigate to="/standings" replace />} />
        <Route path="history"      element={<Navigate to="/standings?tab=historical" replace />} />
        <Route path="teams"        element={<Navigate to="/standings?tab=myteams" replace />} />
        <Route path="reveal"       element={<Navigate to="/standings?tab=recap" replace />} />
        <Route path="reveal/:week" element={<Navigate to="/standings?tab=recap" replace />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="scoring/:week" element={<AdminScoring />} />
        <Route path="weeks"         element={<AdminWeeks />} />
        <Route path="users"         element={<AdminUsers />} />
        <Route path="invites"       element={<AdminInvites />} />
        <Route path="directions"    element={<AdminDirections />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
