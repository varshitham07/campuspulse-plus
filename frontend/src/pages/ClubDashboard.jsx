import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, CategoryBadge } from '../components/Badges';

const EVENT_CATEGORIES = ['technical', 'cultural', 'workshop', 'competition', 'seminar', 'meeting', 'networking'];
const FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox', 'number', 'email'];
const TABS = ['Events', 'Forms', 'Media', 'Links', 'Team & Access', 'Profile'];

function EventForm({ clubId, locations, existing, onSaved, onCancel }) {
  const [form, setForm] = useState(existing || {
    title: '', category: 'technical', description: '', location_id: '', starts_at: '', ends_at: '', capacity: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toMysqlDatetime(value) {
    if (!value) return null;
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    return withSeconds.replace('T', ' ');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        club_id: clubId,
        location_id: form.location_id || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        starts_at: toMysqlDatetime(form.starts_at),
        ends_at: form.ends_at ? toMysqlDatetime(form.ends_at) : null,
      };
      if (existing) {
        await api.patch(`/events/${existing.id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20 }}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="ev-title">Title</label>
        <input id="ev-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label htmlFor="ev-category">Category</label>
          <select id="ev-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="ev-location">Location</label>
          <select id="ev-location" value={form.location_id || ''} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
            <option value="">Select…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ev-description">Description</label>
        <textarea id="ev-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label htmlFor="ev-starts">Starts at</label>
          <input id="ev-starts" type="datetime-local" required value={form.starts_at?.slice(0, 16) || ''} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </div>
        <div className="field grow">
          <label htmlFor="ev-capacity">Capacity <span className="faint">(optional)</span></label>
          <input id="ev-capacity" type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </div>
      </div>
      {existing && (
        <div className="field">
          <label htmlFor="ev-status">Status</label>
          <select id="ev-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="scheduled">Scheduled</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}
      <div className="row gap-3">
        <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : existing ? 'Save changes' : 'Create event'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function EventsTab({ club, locations }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  function load() {
    setLoading(true);
    api.get(`/events?clubId=${club.id}&upcoming=false&pageSize=100`).then((e) => setEvents(e.events)).finally(() => setLoading(false));
  }
  useEffect(load, [club.id]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => { setCreating(true); setEditing(null); }}>Create event</button>
      </div>

      {(creating || editing) && (
        <EventForm
          clubId={club.id}
          locations={locations}
          existing={editing}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
          onCancel={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {events.length === 0 ? (
        <EmptyState title="No events yet" body="Create your first event to get started." />
      ) : (
        <div className="stack gap-3">
          {events.map((e) => (
            <div key={e.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="row gap-2"><CategoryBadge category={e.category} /><StatusBadge status={e.status} /></div>
                <span className="small faint">{e.registered_count}{e.capacity ? `/${e.capacity}` : ''} registered</span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{e.title}</p>
              <p className="small muted" style={{ marginBottom: 12 }}>{new Date(e.starts_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <div className="row gap-3">
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(e); setCreating(false); }}>Edit</button>
                <Link to={`/events/${e.id}/registrations`} className="btn btn-ghost btn-sm">View registrations</Link>
                <Link to={`/events/${e.id}`} className="btn btn-ghost btn-sm">View public page</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormBuilder({ clubId, onSaved, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([{ label: '', field_type: 'text', is_required: true, options: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(i, patch) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addField() {
    setFields((prev) => [...prev, { label: '', field_type: 'text', is_required: false, options: '' }]);
  }
  function removeField(i) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (fields.some((f) => !f.label.trim())) { setError('Every field needs a label.'); return; }
    setSubmitting(true);
    try {
      await api.post('/forms', {
        club_id: clubId,
        title,
        description,
        fields: fields.map((f) => ({
          label: f.label,
          field_type: f.field_type,
          is_required: f.is_required,
          options: f.field_type === 'select' ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20 }}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="form-title">Form title</label>
        <input id="form-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hackathon team sign-up" />
      </div>
      <div className="field">
        <label htmlFor="form-description">Description <span className="faint">(optional)</span></label>
        <textarea id="form-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <p className="small" style={{ fontWeight: 600, marginBottom: 10 }}>Fields</p>
      <div className="stack gap-3" style={{ marginBottom: 16 }}>
        {fields.map((f, i) => (
          <div key={i} className="card-flat">
            <div className="row gap-3" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
              <div className="field grow" style={{ marginBottom: 0, minWidth: 160 }}>
                <label htmlFor={`field-label-${i}`}>Label</label>
                <input id={`field-label-${i}`} required value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="e.g. Team name" />
              </div>
              <div className="field" style={{ marginBottom: 0, width: 140 }}>
                <label htmlFor={`field-type-${i}`}>Type</label>
                <select id={`field-type-${i}`} value={f.field_type} onChange={(e) => updateField(i, { field_type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {f.field_type === 'select' && (
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor={`field-options-${i}`}>Options <span className="faint">(comma-separated)</span></label>
                <input id={`field-options-${i}`} value={f.options} onChange={(e) => updateField(i, { options: e.target.value })} placeholder="e.g. Team of 2, Team of 3, Team of 4" />
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <label className="small row gap-2" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={f.is_required} onChange={(e) => updateField(i, { is_required: e.target.checked })} />
                Required
              </label>
              {fields.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeField(i)}>Remove field</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="row gap-3">
        <button type="button" className="btn btn-secondary btn-sm" onClick={addField}>+ Add field</button>
      </div>
      <div className="divider" />
      <div className="row gap-3">
        <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create form'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function FormsTab({ club }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/forms/club/${club.id}`).then((d) => setForms(d.forms)).finally(() => setLoading(false));
  }
  useEffect(load, [club.id]);

  async function toggleOpen(form) {
    await api.patch(`/forms/${form.id}/open`, { is_open: !form.is_open });
    load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>Create form</button>
      </div>

      {creating && <FormBuilder clubId={club.id} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}

      {forms.length === 0 ? (
        <EmptyState title="No forms yet" body="Create a sign-up or feedback form for your club." />
      ) : (
        <div className="stack gap-3">
          {forms.map((f) => (
            <div key={f.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontWeight: 600 }}>{f.title}</p>
                <span className={`badge ${f.is_open ? 'badge-success' : 'badge-neutral'}`}>{f.is_open ? 'Open' : 'Closed'}</span>
              </div>
              {f.description && <p className="small muted" style={{ marginBottom: 8 }}>{f.description}</p>}
              <p className="small faint" style={{ marginBottom: 12 }}>{f.response_count} response{f.response_count === 1 ? '' : 's'}</p>
              <div className="row gap-3">
                <Link to={`/forms/${f.id}/responses`} className="btn btn-secondary btn-sm">View responses</Link>
                <Link to={`/forms/${f.id}`} className="btn btn-ghost btn-sm">View public form</Link>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleOpen(f)}>{f.is_open ? 'Close form' : 'Reopen form'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaTab({ club }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/media/club/${club.id}`).then((d) => setMedia(d.media)).finally(() => setLoading(false));
  }
  useEffect(load, [club.id]);

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    if (!file) { setError('Choose an image first.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('club_id', club.id);
      if (caption) formData.append('caption', caption);
      await api.upload('/media', formData);
      setFile(null);
      setCaption('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    await api.del(`/media/${id}`);
    load();
  }

  return (
    <div>
      <form onSubmit={handleUpload} className="card" style={{ marginBottom: 24 }}>
        {error && <div className="form-error">{error}</div>}
        <div className="row gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field grow" style={{ marginBottom: 0, minWidth: 200 }}>
            <label htmlFor="media-file">Image</label>
            <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
          <div className="field grow" style={{ marginBottom: 0, minWidth: 200 }}>
            <label htmlFor="media-caption">Caption <span className="faint">(optional)</span></label>
            <input id="media-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
        </div>
        <p className="small faint" style={{ marginTop: 10, marginBottom: 0 }}>JPEG, PNG, WEBP, or GIF — 5MB max.</p>
      </form>

      {loading ? <Loading /> : media.length === 0 ? (
        <EmptyState title="No photos yet" body="Upload photos from events, meetings, or activities." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {media.map((m) => (
            <div key={m.id} className="card" style={{ padding: 8 }}>
              <img src={m.url} alt={m.caption || 'Club photo'} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
              {m.caption && <p className="small muted" style={{ marginBottom: 6 }}>{m.caption}</p>}
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinksTab({ club }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/links/club/${club.id}`).then((d) => setLinks(d.links)).finally(() => setLoading(false));
  }
  useEffect(load, [club.id]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/links', { club_id: club.id, label, url });
      setLabel('');
      setUrl('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await api.del(`/links/${id}`);
    load();
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="card" style={{ marginBottom: 24 }}>
        {error && <div className="form-error">{error}</div>}
        <div className="row gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field grow" style={{ marginBottom: 0, minWidth: 140 }}>
            <label htmlFor="link-label">Label</label>
            <input id="link-label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Discord" />
          </div>
          <div className="field grow" style={{ marginBottom: 0, minWidth: 220 }}>
            <label htmlFor="link-url">URL</label>
            <input id="link-url" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add link'}</button>
        </div>
      </form>

      {loading ? <Loading /> : links.length === 0 ? (
        <EmptyState title="No links yet" body="Add your club's Discord, GitHub, Instagram, or anything else useful." />
      ) : (
        <div className="stack gap-2">
          {links.map((l) => (
            <div key={l.id} className="card-flat row" style={{ justifyContent: 'space-between' }}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="small" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{l.label} ↗</a>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(l.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamAccessTab({ club, assignments, onSaved }) {
  const { user, clubLeadership } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPresident = clubLeadership.some(x => Number(x.club_id) === Number(club.id) && x.role === 'president');
  const [candidates,setCandidates]=useState([]),[selected,setSelected]=useState(''),[role,setRole]=useState('vice_president'),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{api.get(`/clubs/${club.id}/assignment-candidates${query?`?q=${encodeURIComponent(query)}`:''}`).then(d=>setCandidates(d.candidates)).catch(()=>setCandidates([]));},[club.id,query]);
  async function assign(){if(!selected)return;setBusy(true);setMessage('');try{await api.post(`/clubs/${club.id}/assignments`,{user_id:Number(selected),assignment_role:role});setMessage('Club access assigned.');setSelected('');onSaved();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  async function remove(a){setMessage('');try{await api.del(`/clubs/${club.id}/assignments/${a.id}`);setMessage('Access removed.');onSaved();}catch(e){setMessage(e.message);}}
  const canDelegate=isAdmin||isPresident;
  return <div className="stack gap-4"><section className="detail-panel"><div className="row" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><h3>People with club access</h3><p className="small muted">Access is limited to <strong>{club.name}</strong>. It never changes the person's base identity.</p></div>{canDelegate&&<span className="badge badge-success">Delegated access</span>}</div>{message&&<div className="form-success" style={{marginTop:14}}>{message}</div>}<div className="stack gap-2" style={{marginTop:14}}>{assignments.map(a=><div key={a.id} className="card-flat row" style={{justifyContent:'space-between',gap:12}}><div><strong>{a.full_name}</strong><div className="small muted">{a.identity_role} · {a.assignment_role.replace('_',' ')}</div></div>{(isAdmin||(isPresident&&a.assignment_role==='vice_president'||isPresident&&a.assignment_role==='member_manager'))&&<button className="btn btn-ghost btn-sm" onClick={()=>remove(a)}>Remove</button>}</div>)}</div></section>
  {canDelegate&&<section className="detail-panel"><h3>Delegate a responsibility</h3><p className="small muted" style={{marginBottom:14}}>{isPresident&&!isAdmin?'As President, you can appoint a VP or other club-access person.':'Admin can appoint President, VP or Faculty Coordinator.'}</p><div className="row gap-3" style={{flexWrap:'wrap'}}><div className="field" style={{flex:'1 1 220px'}}><label>Search person</label><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email or student ID"/></div><div className="field" style={{flex:'1 1 220px'}}><label>Person</label><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select person</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.role}{c.department?` · ${c.department}`:''}</option>)}</select></div><div className="field" style={{flex:'0 1 220px'}}><label>Responsibility</label><select value={role} onChange={e=>setRole(e.target.value)}>{isAdmin&&<><option value="president">President</option><option value="faculty_coordinator">Faculty Coordinator</option></>}<option value="vice_president">Vice President</option><option value="member_manager">Club Access</option></select></div><button className="btn btn-primary" disabled={!selected||busy} onClick={assign}>{busy?'Assigning…':'Assign'}</button></div></section>}
  </div>;
}

function ClubProfileForm({ club, onSaved }) {
  const [form, setForm] = useState({
    description: club.description, faculty_coordinator: club.faculty_coordinator, contact_email: club.contact_email,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.patch(`/clubs/${club.id}`, form);
      setSuccess('Profile updated.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      <div className="field">
        <label htmlFor="profile-description">Description</label>
        <textarea id="profile-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label htmlFor="profile-coordinator">Faculty coordinator</label>
          <input id="profile-coordinator" required value={form.faculty_coordinator} onChange={(e) => setForm({ ...form, faculty_coordinator: e.target.value })} />
        </div>
        <div className="field grow">
          <label htmlFor="profile-contact">Contact email</label>
          <input id="profile-contact" type="email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </div>
      </div>
      <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

export default function ClubDashboard() {
  const [club, setClub] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Events');

  function load() {
    setLoading(true);
    Promise.all([api.get('/clubs/mine'), api.get('/navigation/locations')]).then(([c, l]) => {
      setClub(c.club || null);
      setAssignments(c.assignments || []);
      setLocations(l.locations);
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  if (loading) return <div className="container page"><Loading /></div>;
  if (!club) return <div className="container page"><EmptyState title="No club found" body="You don't appear to be assigned to a club yet." /></div>;

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="badge badge-neutral">{club.category}</span>
          <h1 style={{ fontSize: 26, margin: '8px 0' }}>{club.name}</h1>
        </div>
        <Link to="/announcements/new" className="btn btn-secondary">Send announcement</Link>
      </div>

      <div className="pill-tabs" style={{ margin: '20px 0 24px' }}>
        {TABS.map((t) => <button key={t} className={`pill-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Events' && <EventsTab club={club} locations={locations} />}
      {tab === 'Forms' && <FormsTab club={club} />}
      {tab === 'Media' && <MediaTab club={club} />}
      {tab === 'Links' && <LinksTab club={club} />}
      {tab === 'Team & Access' && <TeamAccessTab club={club} assignments={assignments} onSaved={load} />}
      {tab === 'Profile' && <ClubProfileForm club={club} onSaved={load} />}
    </div>
  );
}
