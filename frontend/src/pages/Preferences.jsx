import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Loading } from '../components/States';

const TYPE_LABELS = { year: 'Year', department: 'Department', interest: 'Interests', role: 'Role' };
const TYPE_ORDER = ['year', 'department', 'role', 'interest'];

export default function Preferences() {
  const [topics, setTopics] = useState([]);
  const [subscribed, setSubscribed] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api.get('/topics'), api.get('/topics/mine')]).then(([all, mine]) => {
      setTopics(all.topics);
      setSubscribed(new Set(mine.topics.map((t) => t.id)));
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(topic) {
    setPending(topic.id);
    const isSubscribed = subscribed.has(topic.id);
    try {
      if (isSubscribed) {
        await api.del(`/topics/${topic.id}/subscribe`);
        setSubscribed((prev) => { const next = new Set(prev); next.delete(topic.id); return next; });
      } else {
        await api.post(`/topics/${topic.id}/subscribe`, {});
        setSubscribed((prev) => new Set(prev).add(topic.id));
      }
    } catch (err) {
      // leave state as-is on failure
    } finally {
      setPending(null);
    }
  }

  if (loading) return <div className="container page"><Loading /></div>;

  const grouped = TYPE_ORDER.map((type) => ({ type, items: topics.filter((t) => t.type === type) })).filter((g) => g.items.length > 0);

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Notification preferences</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Choose the groups relevant to you. You'll get alerts sent to any of these — on top of true campus-wide
        announcements, which everyone always receives.
      </p>

      {grouped.map((group) => (
        <div key={group.type} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 14 }}>{TYPE_LABELS[group.type]}</h3>
          <div className="pill-tabs">
            {group.items.map((t) => (
              <button
                key={t.id}
                className={`pill-tab ${subscribed.has(t.id) ? 'active' : ''}`}
                disabled={pending === t.id}
                onClick={() => toggle(t)}
              >
                {subscribed.has(t.id) ? '✓ ' : ''}{t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
