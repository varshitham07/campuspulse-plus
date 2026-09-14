import React from 'react';

export default function LoadMore({ hasMore, loadingMore, onClick }) {
  if (!hasMore) return null;
  return (
    <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
      <button className="btn btn-secondary" onClick={onClick} disabled={loadingMore}>
        {loadingMore ? 'Loading…' : 'Load more'}
      </button>
    </div>
  );
}
