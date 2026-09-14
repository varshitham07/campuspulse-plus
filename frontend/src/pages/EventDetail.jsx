import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, ErrorState } from '../components/States';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/events/${id}`)
      .then((d) => { setEvent(d.event); setMyRegistration(d.myRegistration); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function handleRegister() {
    setSubmitting(true);
    setActionMsg('');
    try {
      const res = await api.post(`/events/${id}/register`, {});
      setMyRegistration(res.status);
      setActionMsg(res.message);
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    try {
      await api.del(`/events/${id}/register`);
      setMyRegistration('cancelled');
      setActionMsg('Registration cancelled.');
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container page"><Loading /></div>;
  if (error || !event) return <div className="container page"><ErrorState onRetry={load} /></div>;

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <Link to="/events" className="small muted">← All events</Link>
      <div className="row gap-2" style={{ margin: '16px 0 8px' }}>
        <CategoryBadge category={event.category} />
        <StatusBadge status={event.status} />
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>{event.title}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Organized by {event.club_name}</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row gap-5" style={{ flexWrap: 'wrap' }}>
          <div>
            <p className="small faint">When</p>
            <p style={{ fontWeight: 600 }}>{new Date(event.starts_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <div>
            <p className="small faint">Where</p>
            <p style={{ fontWeight: 600 }}>{event.location_name || event.custom_location || 'To be announced'}</p>
          </div>
          {event.capacity && (
            <div>
              <p className="small faint">Capacity</p>
              <p style={{ fontWeight: 600 }}>{event.capacity} seats</p>
            </div>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: 10 }}>About this event</h3>
      <p className="muted" style={{ marginBottom: 28, lineHeight: 1.6 }}>{event.description}</p>

      {actionMsg && <div className="form-success">{actionMsg}</div>}

      {isAuthenticated ? (
        event.status !== 'scheduled' ? (
          <p className="small muted">This event is {event.status} and isn't open for registration.</p>
        ) : myRegistration === 'registered' || myRegistration === 'waitlisted' ? (
          <div className="row gap-3">
            <span className="badge badge-success">{myRegistration === 'registered' ? "You're registered" : "You're waitlisted"}</span>
            <button className="btn btn-secondary btn-sm" disabled={submitting} onClick={handleCancel}>Cancel registration</button>
          </div>
        ) : (
          <button className="btn btn-primary" disabled={submitting} onClick={handleRegister}>
            {submitting ? 'Registering…' : 'Register for this event'}
          </button>
        )
      ) : (
        <Link to="/login" className="btn btn-primary">Sign in to register</Link>
      )}

      {event.location_id && (
        <div style={{ marginTop: 28 }}>
          <Link to={`/map?to=${event.location_id}`} className="btn btn-secondary btn-sm">Navigate here →</Link>
        </div>
      )}
    </div>
  );
}
