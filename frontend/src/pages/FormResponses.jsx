import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, ErrorState } from '../components/States';

export default function FormResponses() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api.get(`/forms/${id}/responses`).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  if (loading) return <div className="container page"><Loading /></div>;
  if (error || !data) return <div className="container page"><ErrorState onRetry={load} /></div>;

  return (
    <div className="container page">
      <Link to="/club-dashboard" className="small muted">← Back to dashboard</Link>
      <h1 style={{ fontSize: 24, margin: '16px 0 4px' }}>{data.formTitle}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>{data.responses.length} response{data.responses.length === 1 ? '' : 's'}</p>

      {data.responses.length === 0 ? (
        <EmptyState title="No responses yet" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                {data.fields.map((f) => <th key={f.id}>{f.label}</th>)}
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td className="small">{r.email}</td>
                  {data.fields.map((f) => <td key={f.id} className="small">{r.answers[f.id] || '—'}</td>)}
                  <td className="small faint">{new Date(r.submitted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
