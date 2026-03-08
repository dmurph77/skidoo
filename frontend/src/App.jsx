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
import Dashboard from './pages/Dashboard';
import SubmitPicks from './pages/SubmitPicks';
import Explore from './pages/Explore';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Profile from './pages/Profile';
import HeadToHead from './pages/HeadToHead';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminScoring from './pages/admin/AdminScoring';
import AdminWeeks from './pages/admin/AdminWeeks';
import AdminUsers from './pages/admin/AdminUsers';
import AdminInvites from './pages/admin/AdminInvites';
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
      {/* Public */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email"    element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Player app */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="picks"      element={<SubmitPicks />} />
        <Route path="picks/:week" element={<SubmitPicks />} />
        <Route path="explore"    element={<Explore />} />
        {/* Legacy deep-link redirects */}
        <Route path="history"    element={<Navigate to="/explore?tab=history" replace />} />
        <Route path="teams"      element={<Navigate to="/explore?tab=teams" replace />} />
        <Route path="reveal"     element={<Navigate to="/explore?tab=reveal" replace />} />
        <Route path="reveal/:week" element={<Navigate to="/explore?tab=reveal" replace />} />
        <Route path="leaderboard"  element={<Leaderboard />} />
        <Route path="h2h/:userId"   element={<HeadToHead />} />
        <Route path="rules"         element={<Rules />} />
        <Route path="profile"    element={<Profile />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="scoring/:week" element={<AdminScoring />} />
        <Route path="weeks"      element={<AdminWeeks />} />
        <Route path="users"      element={<AdminUsers />} />
        <Route path="invites"    element={<AdminInvites />} />
        <Route path="directions" element={<AdminDirections />} />
      </Route>

      <Route path="/standings" element={<PublicLeaderboard />} />
      <Route path="/how-to-play" element={<HowToPlay />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
