import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { Loading, EmptyState, ErrorState } from '../components/States';
import { StatusBadge } from '../components/Badges';
import LoadMore from '../components/LoadMore';

function ConfidenceMeter({ score }) {
  const cls = score >= 70 ? 'high' : score >= 40 ? '' : 'low';
  return (
    <div>
      <div className="confidence-track"><div className={`confidence-fill ${cls}`} style={{ width: `${score}%` }} /></div>
      <p className="small faint" style={{ marginTop: 4 }}>{score}% confidence</p>
    </div>
  );
}

export default function Incidents() {
  const [status, setStatus] = useState('');

  const { items: incidents, loading, loadingMore, hasMore, error, reload, loadMore } = usePaginatedList(
    (page) => api.get(`/incidents${status ? `?status=${status}&` : '?'}page=${page}`).then((d) => ({ items: d.incidents, hasMore: d.hasMore })),
    [status]
  );

  const filters = [
    { v: '', label: 'All' },
    { v: 'unverified', label: 'Unverified' },
    { v: 'community_verified', label: 'Community Verified' },
    { v: 'officially_verified', label: 'Officially Verified' },
  ];

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Campus reports</h1>
          <p className="muted">Real-time updates from students, confirmed by the community and verified by faculty.</p>
        </div>
        <Link to="/incidents/report" className="btn btn-primary">Report an update</Link>
      </div>

      <div className="pill-tabs" style={{ marginBottom: 24 }}>
        {filters.map((f) => (
          <button key={f.v} className={`pill-tab ${status === f.v ? 'active' : ''}`} onClick={() => setStatus(f.v)}>{f.label}</button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState onRetry={reload} />}
      {!loading && !error && incidents.length === 0 && <EmptyState title="No reports here" body="Nothing to see in this category right now." />}

      {!loading && !error && (
        <>
          <div className="stack gap-3">
            {incidents.map((i) => (
              <Link key={i.id} to={`/incidents/${i.id}`} className="card card-interactive">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <StatusBadge status={i.status} />
                  <span className="small faint">{new Date(i.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{i.title}</p>
                <p className="small muted" style={{ marginBottom: 12 }}>{i.description}</p>
                {i.old_location_name && i.new_location_name && (
                  <p className="small faint" style={{ marginBottom: 12 }}>{i.old_location_name} → {i.new_location_name}</p>
                )}
                <div className="row gap-4" style={{ alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, maxWidth: 220 }}><ConfidenceMeter score={Number(i.confidence_score)} /></div>
                  <span className="small faint">{i.confirm_count} confirmed{i.reject_count > 0 ? `, ${i.reject_count} disputed` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
          <LoadMore hasMore={hasMore} loadingMore={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
