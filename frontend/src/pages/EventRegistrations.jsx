import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, ErrorState } from '../components/States';
import { StatusBadge } from '../components/Badges';

export default function EventRegistrations() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/events/${id}/registrations`),
    ]).then(([e, r]) => {
      setEvent(e.event);
      setRegistrations(r.registrations);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  if (loading) return <div className="container page"><Loading /></div>;
  if (error) return <div className="container page"><ErrorState onRetry={load} /></div>;

  const registeredCount = registrations.filter((r) => r.status === 'registered').length;
  const waitlistedCount = registrations.filter((r) => r.status === 'waitlisted').length;

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <Link to="/club-dashboard" className="small muted">← Back to dashboard</Link>
      <h1 style={{ fontSize: 24, margin: '16px 0 4px' }}>{event.title}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {registeredCount} registered{event.capacity ? ` of ${event.capacity} seats` : ''}
        {waitlistedCount > 0 ? ` · ${waitlistedCount} waitlisted` : ''}
      </p>

      {registrations.length === 0 ? (
        <EmptyState title="No registrations yet" />
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Registered</th></tr></thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id}>
                <td>{r.full_name}</td>
                <td className="small">{r.email}</td>
                <td className="small">{r.department || '—'}{r.year_of_study ? `, Y${r.year_of_study}` : ''}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="small faint">{new Date(r.registered_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
