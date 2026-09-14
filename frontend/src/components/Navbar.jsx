import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Navbar() {
  const { user, logout, isAuthenticated, isClubLeader } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (searchTerm.trim().length < 2) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <header className="topnav">
      <div className="container topnav-inner">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="brand">CampusPulse<span className="plus">+</span></Link>

        {isAuthenticated ? (
          <div className="row gap-5">
            <form onSubmit={handleSearch} className="desktop-only" style={{ width: 220 }}>
              <input
                type="search"
                placeholder="Search campus…"
                aria-label="Search campus"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </form>
            <nav className="nav-links desktop-only">
              <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
              <NavLink to="/announcements" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Alerts</NavLink>
              <NavLink to="/events" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Events</NavLink>
              <NavLink to="/clubs" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Clubs</NavLink>
              <NavLink to="/incidents" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Reports</NavLink>
              <NavLink to="/map" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Map</NavLink>
              <NavLink to="/directory" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Directory</NavLink>
              {user?.role === 'admin' && <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Admin</NavLink>}
              {user?.role === 'teacher' && <NavLink to="/teacher" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Teacher</NavLink>}
              {isClubLeader && <NavLink to="/club-dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>My Club</NavLink>}
            </nav>

            <div className="row gap-3">
              <Link to="/preferences" className="btn btn-ghost btn-sm desktop-only">Preferences</Link>
              <Link to="/notifications" className="btn btn-ghost btn-sm" style={{ position: 'relative' }}>
                Alerts
                {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-critical)' }} />}
              </Link>
              <div className="row gap-2">
                <span className="small muted desktop-only">{user?.full_name}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="row gap-3">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
}
