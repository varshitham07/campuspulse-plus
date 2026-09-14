import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, ErrorState } from '../components/States';
import { useAuth } from '../context/AuthContext';

export default function FormFill() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/forms/${id}`)
      .then((d) => { setForm(d.form); setFields(d.fields); setAlreadySubmitted(d.alreadySubmitted); })
      .catch(() => setError('load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = fields.map((f) => ({ fieldId: f.id, value: f.field_type === 'checkbox' ? (answers[f.id] ? 'Yes' : 'No') : (answers[f.id] || '') }));
      await api.post(`/forms/${id}/submit`, { answers: payload });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container page"><Loading /></div>;
  if (error === 'load' || !form) return <div className="container page"><ErrorState message="This form isn't available." /></div>;

  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <p className="small faint" style={{ marginBottom: 8 }}>{form.club_name}</p>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{form.title}</h1>
      {form.description && <p className="muted" style={{ marginBottom: 24 }}>{form.description}</p>}

      {!form.is_open ? (
        <div className="alert alert-info">This form is no longer accepting responses.</div>
      ) : success || alreadySubmitted ? (
        <div className="form-success">You've already submitted a response to this form. Thanks!</div>
      ) : !isAuthenticated ? (
        <div className="alert alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <span>Sign in to fill out this form.</span>
          <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          {fields.map((f) => (
            <div className="field" key={f.id}>
              <label htmlFor={`answer-${f.id}`}>{f.label}{f.is_required && ' *'}</label>
              {f.field_type === 'textarea' && (
                <textarea id={`answer-${f.id}`} required={f.is_required} value={answers[f.id] || ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
              )}
              {f.field_type === 'select' && (
                <select id={`answer-${f.id}`} required={f.is_required} value={answers[f.id] || ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })}>
                  <option value="">Select…</option>
                  {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {f.field_type === 'checkbox' && (
                <label className="row gap-2" style={{ fontWeight: 400 }}>
                  <input id={`answer-${f.id}`} type="checkbox" checked={!!answers[f.id]} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.checked })} />
                  Yes
                </label>
              )}
              {['text', 'number', 'email'].includes(f.field_type) && (
                <input id={`answer-${f.id}`} type={f.field_type} required={f.is_required} value={answers[f.id] || ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
              )}
            </div>
          ))}
          <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </form>
      )}
    </div>
  );
}
