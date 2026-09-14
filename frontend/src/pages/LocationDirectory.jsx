import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/States';

const CATEGORY_LABELS = {
  academic: 'Academic', admin: 'Administration', food: 'Food & Dining',
  medical: 'Medical', parking: 'Parking', entrance: 'Entrance',
};

export default function LocationDirectory() {
  const [locations, setLocations] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/navigation/locations').then((d) => setLocations(d.locations)).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ['all', ...new Set(locations.map((l) => l.category))], [locations]);

  const filtered = locations.filter((l) => {
    const matchesQ = !q || l.name.toLowerCase().includes(q.toLowerCase()) || (l.description || '').toLowerCase().includes(q.toLowerCase());
    const matchesCategory = category === 'all' || l.category === category;
    return matchesQ && matchesCategory;
  });

  return (
    <div className="container page">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Campus directory</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Every important location on campus, in one searchable place.</p>

      <input
        placeholder="Search buildings, offices, facilities…"
        aria-label="Search campus locations"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 360 }}
      />

      <div className="pill-tabs" style={{ marginBottom: 28 }}>
        {categories.map((c) => (
          <button key={c} className={`pill-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c === 'all' ? 'All' : CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {!loading && filtered.length === 0 && <EmptyState title="No matching locations" body="Try a different search term." />}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map((l) => (
            <div key={l.id} className="card stack gap-2">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="badge badge-neutral">{CATEGORY_LABELS[l.category] || l.category}</span>
              </div>
              <p style={{ fontWeight: 600 }}>{l.name}</p>
              {l.description && <p className="small muted">{l.description}</p>}
              <Link to={`/map?to=${l.id}`} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Navigate here</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
