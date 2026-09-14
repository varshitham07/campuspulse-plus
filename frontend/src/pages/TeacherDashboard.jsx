import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/States';
import { StatusBadge } from '../components/Badges';

export default function TeacherDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/incidents?status=community_verified&pageSize=100'),
      api.get('/announcements'),
    ]).then(([i, a]) => {
      setIncidents(i.incidents);
      setAnnouncements(a.announcements.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container page"><Loading /></div>;

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Teacher dashboard</h1>
          <p className="muted">Send academic alerts and review reports awaiting official verification.</p>
        </div>
        <Link to="/announcements/new" className="btn btn-primary">New announcement</Link>
      </div>

      <h3 style={{ marginBottom: 14 }}>Awaiting your verification</h3>
      {incidents.length === 0 ? (
        <EmptyState title="Nothing pending" body="Community-confirmed reports needing official sign-off will appear here." />
      ) : (
        <div className="stack gap-3" style={{ marginBottom: 36 }}>
          {incidents.map((i) => (
            <Link key={i.id} to={`/incidents/${i.id}`} className="card card-interactive">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <StatusBadge status={i.status} />
                <span className="small faint">{i.confirm_count} confirmed</span>
              </div>
              <p style={{ fontWeight: 600 }}>{i.title}</p>
              <p className="small muted">{i.description}</p>
            </Link>
          ))}
        </div>
      )}

      <h3 style={{ marginBottom: 14 }}>Recent activity</h3>
      <div className="stack gap-2">
        {announcements.map((a) => (
          <div key={a.id} className="card-flat">
            <p className="small" style={{ fontWeight: 600 }}>{a.title}</p>
            <p className="small faint">{a.author_name} · {new Date(a.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
