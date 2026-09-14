import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { Loading, EmptyState, ErrorState } from '../components/States';
import { UrgencyBadge, CategoryBadge } from '../components/Badges';
import LoadMore from '../components/LoadMore';

const CATEGORIES = [
  { v: 'all', label: 'All' },
  { v: 'emergency', label: 'Emergency Alerts' },
  { v: 'exam', label: 'Exam Announcements' },
  { v: 'academic', label: 'Academic Updates' },
  { v: 'club', label: 'Events & Clubs' },
  { v: 'transportation', label: 'Transportation' },
  { v: 'facilities', label: 'Campus Facilities' },
  { v: 'general', label: 'General' },
];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AnnouncementsFeed() {
  const { user } = useAuth();
  const [category, setCategory] = useState('all');

  const { items: announcements, loading, loadingMore, hasMore, error, reload, loadMore } = usePaginatedList(
    (page) => api.get(`/announcements?category=${category}&page=${page}`).then((d) => ({ items: d.announcements, hasMore: d.hasMore })),
    [category]
  );

  async function deleteAnnouncement(id){ if(!window.confirm('Remove this alert for everyone?')) return; try{await api.del(`/announcements/${id}`); reload();}catch(err){window.alert(err.message);} }

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Alerts</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Everything sent to campus, organized so the important things don't get buried.</p>

      <div className="pill-tabs" style={{ marginBottom: 28 }}>
        {CATEGORIES.map((c) => (
          <button key={c.v} className={`pill-tab ${category === c.v ? 'active' : ''}`} onClick={() => setCategory(c.v)}>{c.label}</button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState onRetry={reload} />}
      {!loading && !error && announcements.length === 0 && <EmptyState title="Nothing here yet" body="Alerts in this category will show up as they're sent." />}

      {!loading && !error && (
        <>
          <div className="stack gap-3">
            {announcements.map((a) => (
              <div key={a.id} className={`card ${a.category === 'emergency' ? 'alert-critical' : ''}`} style={a.category === 'emergency' ? { borderColor: '#EFC5C5' } : {}}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="row gap-2">
                    <UrgencyBadge urgency={a.urgency} />
                    <CategoryBadge category={a.category} />
                    {a.target_topic_name && <span className="badge badge-accent">{a.target_topic_name}</span>}
                  </div>
                  <span className="small faint">{timeAgo(a.created_at)}</span>
                </div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</p>
                <p className="small muted" style={{ marginBottom: 8 }}>{a.body}</p>

                {a.instructions && (
                  <div className="card-flat small" style={{ marginBottom: 10 }}>
                    <strong>What to do: </strong>{a.instructions}
                  </div>
                )}

                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p className="small faint">{a.author_name} · {a.author_role.replace('_', ' ')}{a.club_name ? ` · ${a.club_name}` : ''}</p>
                  <div className="row gap-2">
                  {(user?.role === 'admin' || Number(a.author_id) === Number(user?.id)) && <button className="btn btn-ghost btn-sm" onClick={() => deleteAnnouncement(a.id)}>Delete for everyone</button>}
                  {a.safe_location_id && (
                    <Link to={`/map?to=${a.safe_location_id}`} className="btn btn-danger btn-sm">
                      Get directions to {a.safe_location_name} →
                    </Link>
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <LoadMore hasMore={hasMore} loadingMore={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
