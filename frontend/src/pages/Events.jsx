import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { Loading, EmptyState, ErrorState } from '../components/States';
import { CategoryBadge } from '../components/Badges';
import LoadMore from '../components/LoadMore';

const CATEGORIES = ['all', 'technical', 'cultural', 'workshop', 'competition', 'seminar', 'meeting', 'networking'];

function formatEventTime(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
}

export default function Events() {
  const [category, setCategory] = useState('all');

  const { items: events, loading, loadingMore, hasMore, error, reload, loadMore } = usePaginatedList(
    (page) => api.get(`/events?category=${category}&page=${page}`).then((d) => ({ items: d.events, hasMore: d.hasMore })),
    [category]
  );

  return (
    <div className="container page">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Events & workshops</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Hackathons, seminars, competitions and club meetings across campus.</p>

      <div className="pill-tabs" style={{ marginBottom: 28 }}>
        {CATEGORIES.map((c) => (
          <button key={c} className={`pill-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState onRetry={reload} />}
      {!loading && !error && events.length === 0 && (
        <EmptyState title="No events in this category" body="Check back soon, or try a different filter." />
      )}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {events.map((e) => (
              <Link key={e.id} to={`/events/${e.id}`} className="card card-interactive stack gap-2">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <CategoryBadge category={e.category} />
                  {e.capacity && (
                    <span className="small faint">{e.registered_count}/{e.capacity}</span>
                  )}
                </div>
                <p style={{ fontWeight: 600 }}>{e.title}</p>
                <p className="small muted">{e.club_name}</p>
                <p className="small faint">{formatEventTime(e.starts_at)}</p>
                <p className="small faint">{e.location_name || e.custom_location || 'Location TBA'}</p>
              </Link>
            ))}
          </div>
          <LoadMore hasMore={hasMore} loadingMore={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
