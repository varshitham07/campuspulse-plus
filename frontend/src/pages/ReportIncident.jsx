import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const CATEGORIES = [
  { v: 'venue_change', label: 'Venue / schedule change' },
  { v: 'facility', label: 'Facility issue' },
  { v: 'safety', label: 'Safety concern' },
  { v: 'other', label: 'Other' },
];

export default function ReportIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: 'venue_change', old_location_id: '', new_location_id: '' });
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/navigation/locations').then((d) => setLocations(d.locations)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setDuplicates([]);
    setSubmitting(true);
    try {
      const res = await api.post('/incidents', {
        ...form,
        old_location_id: form.old_location_id || null,
        new_location_id: form.new_location_id || null,
      });
      if (res.possibleDuplicates?.length) {
        setDuplicates(res.possibleDuplicates);
      } else {
        navigate(`/incidents/${res.incidentId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Report a campus update</h1>
      <p className="muted" style={{ marginBottom: 28 }}>
        Your report starts as unverified. Once enough students confirm it, or a teacher/admin verifies it officially, everyone affected is notified.
      </p>

      {error && <div className="form-error">{error}</div>}

      {duplicates.length > 0 && (
        <div className="alert alert-important" style={{ marginBottom: 20, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <strong className="small">This might already be reported</strong>
          <p className="small">Our system found similar reports — you may want to confirm one of these instead of creating a duplicate:</p>
          <div className="stack gap-2" style={{ width: '100%' }}>
            {duplicates.map((d) => (
              <a key={d.id} href={`/incidents/${d.id}`} className="small" style={{ color: 'var(--color-accent-ink)', fontWeight: 600 }}>{d.title} →</a>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setDuplicates([])}>Submit as a new report anyway</button>
        </div>
      )}

      {duplicates.length === 0 && (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="ri-title">What's happening?</label>
            <input id="ri-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Exam venue changed" />
          </div>
          <div className="field">
            <label htmlFor="ri-description">Details</label>
            <textarea id="ri-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Give as much specific detail as you can." />
          </div>
          <div className="field">
            <label htmlFor="ri-category">Category</label>
            <select id="ri-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </div>

          {form.category === 'venue_change' && (
            <div className="row gap-3">
              <div className="field grow">
                <label htmlFor="ri-old-location">Original location <span className="faint">(optional)</span></label>
                <select id="ri-old-location" value={form.old_location_id} onChange={(e) => setForm({ ...form, old_location_id: e.target.value })}>
                  <option value="">Select…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="field grow">
                <label htmlFor="ri-new-location">New location <span className="faint">(optional)</span></label>
                <select id="ri-new-location" value={form.new_location_id} onChange={(e) => setForm({ ...form, new_location_id: e.target.value })}>
                  <option value="">Select…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit report'}</button>
        </form>
      )}
    </div>
  );
}
