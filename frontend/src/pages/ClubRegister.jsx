import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Literary', 'Social Service', 'Arts', 'Entrepreneurship'];

export default function ClubRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    club_name: '', category: CATEGORIES[0], description: '', faculty_coordinator: '',
    contact_email: '', supporting_info: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/clubs/requests', form);
      setSuccess("Your request has been submitted. You'll be notified once it's reviewed.");
      setTimeout(() => navigate('/clubs'), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Register a Club</h1>
      <p className="muted" style={{ marginBottom: 28 }}>
        Submitted requests go to campus administration for review before the club is listed.
      </p>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cr-name">Club name</label>
          <input id="cr-name" required value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cr-category">Category</label>
          <select id="cr-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cr-description">Description</label>
          <textarea id="cr-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this club do, and who is it for?" />
        </div>
        <div className="field">
          <label htmlFor="cr-coordinator">Faculty coordinator</label>
          <input id="cr-coordinator" required value={form.faculty_coordinator} onChange={(e) => setForm({ ...form, faculty_coordinator: e.target.value })} placeholder="Full name" />
        </div>
        <div className="field">
          <label htmlFor="cr-contact">Contact email</label>
          <input id="cr-contact" type="email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cr-supporting">Supporting information <span className="faint">(optional)</span></label>
          <textarea id="cr-supporting" value={form.supporting_info} onChange={(e) => setForm({ ...form, supporting_info: e.target.value })} placeholder="Prior activity, planned events, anything that helps the review." />
        </div>
        <p className="small faint" style={{ marginBottom: 16 }}>
          Note: you're submitting this request as the proposed president. A vice president can be added after approval.
        </p>
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
      </form>
    </div>
  );
}
