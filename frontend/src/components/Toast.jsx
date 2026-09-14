import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { UrgencyBadge } from './Badges';

export default function Toast() {
  const { toast, dismissToast } = useSocket();
  const navigate = useNavigate();
  if (!toast) return null;

  function takeAction() {
    dismissToast();
    navigate(`/map?to=${toast.actionLocationId}`);
  }

  return (
    <div className="toast" role="status">
      <div className="row gap-2" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <UrgencyBadge urgency={toast.urgency} />
        <button className="btn-ghost btn-sm" style={{ padding: 2 }} onClick={dismissToast} aria-label="Dismiss">✕</button>
      </div>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{toast.title}</p>
      <p className="small muted" style={{ marginBottom: toast.actionLocationId ? 10 : 0 }}>{toast.body}</p>
      {toast.actionLocationId && (
        <button className="btn btn-danger btn-sm btn-block" onClick={takeAction}>{toast.actionLabel || 'Get directions'} →</button>
      )}
    </div>
  );
}
