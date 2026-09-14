import React from 'react';

const STATUS_MAP = {
  unverified: { cls: 'badge-neutral', label: 'Unverified' },
  community_verified: { cls: 'badge-pending', label: 'Community Verified' },
  officially_verified: { cls: 'badge-success', label: 'Officially Verified' },
  rejected: { cls: 'badge-critical', label: 'Rejected' },
  pending: { cls: 'badge-pending', label: 'Pending' },
  under_review: { cls: 'badge-pending', label: 'Under Review' },
  approved: { cls: 'badge-success', label: 'Approved' },
  scheduled: { cls: 'badge-accent', label: 'Scheduled' },
  postponed: { cls: 'badge-pending', label: 'Postponed' },
  cancelled: { cls: 'badge-critical', label: 'Cancelled' },
  completed: { cls: 'badge-neutral', label: 'Completed' },
  registered: { cls: 'badge-success', label: 'Registered' },
  waitlisted: { cls: 'badge-pending', label: 'Waitlisted' },
};

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { cls: 'badge-neutral', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

const URGENCY_MAP = {
  critical: { cls: 'badge-critical', label: 'Critical' },
  important: { cls: 'badge-pending', label: 'Important' },
  normal: { cls: 'badge-neutral', label: 'Normal' },
};

export function UrgencyBadge({ urgency }) {
  const u = URGENCY_MAP[urgency] || URGENCY_MAP.normal;
  return <span className={`badge ${u.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{u.label}</span>;
}

export function CategoryBadge({ category }) {
  return <span className="badge badge-neutral">{category?.replace('_', ' ')}</span>;
}
