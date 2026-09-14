import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, ErrorState } from '../components/States';
import { StatusBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';

export default function IncidentDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const [incident, setIncident] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/incidents/${id}`)
      .then((d) => { setIncident(d.incident); setMyVote(d.myVote); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function vote(v) {
    setSubmitting(true); setMsg('');
    try {
      const res = await api.post(`/incidents/${id}/vote`, { vote: v });
      setMyVote(v);
      setIncident((prev) => ({ ...prev, confidence_score: res.confidence, status: res.status }));
      setMsg(v === 'confirm' ? 'Thanks — your confirmation was recorded.' : 'Thanks — your input was recorded.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function officialAction(decision) {
    setSubmitting(true); setMsg('');
    try {
      const res = await api.post(`/incidents/${id}/verify`, { decision });
      setIncident((prev) => ({ ...prev, status: res.status }));
      setMsg(
        decision === 'verify'
          ? `Marked as officially verified.${res.reroutedSessions ? ` ${res.reroutedSessions} student route${res.reroutedSessions === 1 ? '' : 's'} updated automatically.` : ''}`
          : 'Report marked as rejected.'
      );
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container page"><Loading /></div>;
  if (error || !incident) return <div className="container page"><ErrorState onRetry={load} /></div>;

  const isOwnReport = user && incident.reported_by === user.id;
  const canVote = user && !isOwnReport && incident.status === 'unverified';
  const canOfficiallyVerify = hasRole('admin', 'teacher') && incident.status !== 'officially_verified' && incident.status !== 'rejected';

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <Link to="/incidents" className="small muted">← All reports</Link>

      <div className="row gap-2" style={{ margin: '16px 0 12px' }}>
        <StatusBadge status={incident.status} />
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{incident.title}</h1>
      <p className="muted" style={{ lineHeight: 1.6, marginBottom: 20 }}>{incident.description}</p>

      {incident.old_location_name && incident.new_location_name && (
        <div className="card-flat row gap-2" style={{ marginBottom: 20 }}>
          <span className="small">{incident.old_location_name}</span>
          <span className="small faint">→</span>
          <span className="small" style={{ fontWeight: 600 }}>{incident.new_location_name}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="small faint" style={{ marginBottom: 6 }}>Community confidence</p>
        <div className="confidence-track" style={{ marginBottom: 6 }}>
          <div className={`confidence-fill ${incident.confidence_score >= 70 ? 'high' : incident.confidence_score >= 40 ? '' : 'low'}`} style={{ width: `${incident.confidence_score}%` }} />
        </div>
        <p className="small muted">{incident.confidence_score}% confidence based on student confirmations.</p>
      </div>

      {msg && <div className="form-success">{msg}</div>}

      {isOwnReport && <p className="small faint" style={{ marginBottom: 16 }}>This is your report — you can't confirm your own submission.</p>}

      {canVote && (
        <div className="row gap-3" style={{ marginBottom: 24 }}>
          <button className="btn btn-secondary" disabled={submitting || myVote} onClick={() => vote('confirm')}>
            {myVote === 'confirm' ? '✓ Confirmed' : "I can confirm this"}
          </button>
          <button className="btn btn-ghost" disabled={submitting || myVote} onClick={() => vote('reject')}>
            {myVote === 'reject' ? 'Disputed' : "This doesn't look right"}
          </button>
        </div>
      )}

      {canOfficiallyVerify && (
        <div className="card" style={{ borderColor: 'var(--color-accent)', marginBottom: 24 }}>
          <p className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Official verification</p>
          <p className="small muted" style={{ marginBottom: 14 }}>
            As {user.role.replace('_', ' ')}, you can confirm this report officially.
            {incident.old_location_name && ' Verifying will automatically reroute any student currently navigating to the old location.'}
          </p>
          <div className="row gap-3">
            <button className="btn btn-primary" disabled={submitting} onClick={() => officialAction('verify')}>Officially verify</button>
            <button className="btn btn-ghost" disabled={submitting} onClick={() => officialAction('reject')}>Reject report</button>
          </div>
        </div>
      )}
    </div>
  );
}
