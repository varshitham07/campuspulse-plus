import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './States';

// roles: identity-based gate (admin/teacher/student) — matches backend's
// requireRole. allowClubLeader: also let through anyone currently leading
// at least one club, checked relationally (never a role value) — matches
// backend's requireClubLeaderOr. The two combine with OR, same as the API.
// Neither prop given → open to any signed-in user (e.g. /dashboard).
export default function ProtectedRoute({ children, roles, allowClubLeader = false }) {
  const { isAuthenticated, loading, hasRole, isClubLeader } = useAuth();

  if (loading) return <div className="container page"><Loading label="Checking your session…" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!roles && !allowClubLeader) return children;

  const identityOk = roles ? hasRole(...roles) : false;
  const clubOk = allowClubLeader && isClubLeader;

  if (!identityOk && !clubOk) {
    return (
      <div className="container page">
        <div className="state-block">
          <h3>You don't have access to this page</h3>
          <p className="small muted">This area is restricted to a different role or responsibility.</p>
        </div>
      </div>
    );
  }
  return children;
}
