import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/States';
import { UrgencyBadge } from '../components/Badges';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/notifications').then((d) => setNotifications(d.notifications)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function markAllRead() {
    await api.post('/notifications/read-all', {});
    load();
  }

  function takeAction(n) {
    api.post(`/notifications/${n.id}/read`, {}).catch(() => {});
    navigate(`/map?to=${n.action_location_id}`);
  }

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 26 }}>Notifications</h1>
        <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>
      </div>
      <p className="small" style={{ marginBottom: 24 }}>
        <Link to="/preferences" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Manage what you get notified about →</Link>
      </p>

      {loading && <Loading />}
      {!loading && notifications.length === 0 && <EmptyState title="You're all caught up" />}

      {!loading && (
        <div className="stack gap-2">
          {notifications.map((n) => (
            <div key={n.id} className={`card ${n.urgency === 'critical' ? 'alert-critical' : ''}`} style={{ opacity: n.is_read ? 0.65 : 1 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <UrgencyBadge urgency={n.urgency} />
                <span className="small faint">{new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</p>
              <p className="small muted" style={{ marginBottom: n.action_location_id ? 10 : 0 }}>{n.body}</p>
              {n.action_location_id && (
                <button className="btn btn-danger btn-sm" onClick={() => takeAction(n)}>
                  {n.action_label || `Get directions to ${n.action_location_name}`} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
