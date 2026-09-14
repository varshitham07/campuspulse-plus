import React from 'react';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state-block">
      <div className="spinner" />
      <p className="small">{label}</p>
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      {body && <p className="small">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = "We couldn't load this right now.", onRetry }) {
  return (
    <div className="state-block">
      <p className="small" style={{ color: 'var(--color-critical)' }}>{message}</p>
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
