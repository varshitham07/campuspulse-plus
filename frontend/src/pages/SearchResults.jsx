import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/States';
import { CategoryBadge } from '../components/Badges';

const SECTION_CONFIG = [
  { key: 'events', label: 'Events', linkPrefix: '/events/' },
  { key: 'clubs', label: 'Clubs', linkPrefix: '/clubs/' },
  { key: 'announcements', label: 'Announcements', linkPrefix: null },
  { key: 'locations', label: 'Campus locations', linkPrefix: '/map?to=' },
];

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    api.get(`/search?q=${encodeURIComponent(q)}`).then(setResults).finally(() => setLoading(false));
  }, [q]);

  const totalResults = results ? SECTION_CONFIG.reduce((sum, s) => sum + (results[s.key]?.length || 0), 0) : 0;

  return (
    <div className="container page" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Search results</h1>
      <p className="muted" style={{ marginBottom: 28 }}>{q ? `Showing results for "${q}"` : 'Search announcements, events, clubs, and locations.'}</p>

      {loading && <Loading />}

      {!loading && q.trim().length < 2 && (
        <EmptyState title="Type at least 2 characters" body="Try a class, club name, or a building." />
      )}

      {!loading && results && totalResults === 0 && (
        <EmptyState title="No matches" body="Try a different word, or check the spelling." />
      )}

      {!loading && results && totalResults > 0 && (
        <div className="stack gap-5">
          {SECTION_CONFIG.map((section) => {
            const items = results[section.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={section.key}>
                <h3 style={{ marginBottom: 12 }}>{section.label}</h3>
                <div className="stack gap-2">
                  {items.map((item) => {
                    const content = (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{item.title || item.name}</span>
                        {item.category && <CategoryBadge category={item.category} />}
                      </div>
                    );
                    if (!section.linkPrefix) {
                      return <div key={item.id} className="card-flat">{content}</div>;
                    }
                    return (
                      <Link key={item.id} to={`${section.linkPrefix}${item.id}`} className="card-flat card-interactive">
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
