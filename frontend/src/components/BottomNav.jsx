import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  home: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  events: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  clubs: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5c2.8.3 5 2.4 5 5.5"/></svg>,
  reports: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>,
  map: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2"><path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z"/><path d="M9 7v13M15 4v13"/></svg>,
};

export default function BottomNav() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  const items = [
    { to: '/dashboard', icon: 'home', label: 'Home' },
    { to: '/events', icon: 'events', label: 'Events' },
    { to: '/clubs', icon: 'clubs', label: 'Clubs' },
    { to: '/incidents', icon: 'reports', label: 'Reports' },
    { to: '/map', icon: 'map', label: 'Map' },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (<>{ICONS[item.icon](isActive)}<span>{item.label}</span></>)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
