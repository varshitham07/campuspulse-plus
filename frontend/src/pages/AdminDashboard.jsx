import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { Loading, EmptyState } from '../components/States';
import { StatusBadge, CategoryBadge, UrgencyBadge } from '../components/Badges';
import LoadMore from '../components/LoadMore';

const TABS = ['Overview', 'Student Approvals', 'Club Approvals', 'Clubs & Leadership', 'Classes & Teachers', 'Users', 'Locations & Routes', 'Events', 'Incidents', 'Announcements', 'Notifications', 'Audit Log'];

function OverviewTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/overview').then(setStats); }, []);
  if (!stats) return <Loading />;

  const cards = [
    { label: 'Active users', value: stats.activeUsers },
    { label: 'Active clubs', value: stats.activeClubs },
    { label: 'Pending student registrations', value: stats.pendingStudentRegistrations },
    { label: 'Pending club requests', value: stats.pendingClubRequests },
    { label: 'Upcoming events', value: stats.upcomingEvents },
    { label: 'Open incident reports', value: stats.openIncidents },
    { label: 'Announcements (24h)', value: stats.announcementsLast24h },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {cards.map((c) => (
        <div key={c.label} className="card">
          <p className="small faint" style={{ marginBottom: 8 }}>{c.label}</p>
          <p style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}



function StudentApprovalsTab() {
  const [registrations, setRegistrations] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    api.get(`/admin/registrations/pending${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then((d) => setRegistrations(d.registrations))
      .finally(() => setLoading(false));
  }
  useEffect(load, [q]);

  async function review(token, decision) {
    setMessage('');
    try {
      await api.post(`/admin/registrations/${encodeURIComponent(token)}/review`, { decision });
      setMessage(decision === 'approved' ? 'Student account approved.' : 'Registration rejected.');
      load();
    } catch (err) { setMessage(err.message); }
  }

  return (
    <div>
      <div className="approval-header">
        <div>
          <h2>Student registrations</h2>
          <p className="small muted">Students register themselves and receive a token. Verify the submitted details before granting access.</p>
        </div>
        <input aria-label="Search pending registrations" placeholder="Search token, student ID or name…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {message && <div className="form-success">{message}</div>}
      {loading ? <Loading /> : registrations.length === 0 ? <EmptyState title="No pending registrations" body="New student applications will appear here after they submit the registration form." /> : (
        <div className="stack gap-3">
          {registrations.map((r) => (
            <div key={r.id} className="card approval-card">
              <div className="approval-token-block"><span className="small faint">Registration token</span><strong>{r.registration_token}</strong></div>
              <div className="approval-details">
                <div><strong>{r.full_name}</strong><span>{r.student_id} · {r.department} · Year {r.year_of_study} · {r.class_section}</span></div>
                <div><span>{r.email}</span><span>{r.mobile}</span></div>
                <span className="small faint">Submitted {new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="row gap-2 approval-actions">
                <button className="btn btn-primary btn-sm" onClick={() => review(r.registration_token, 'approved')}>Approve account</button>
                <button className="btn btn-ghost btn-sm" onClick={() => review(r.registration_token, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubApprovalsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  function load() {
    setLoading(true);
    api.get('/clubs/requests/all?status=pending').then((d) => setRequests(d.requests)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function review(id, decision) {
    setMsg('');
    try {
      await api.post(`/clubs/requests/${id}/review`, { decision });
      setMsg(`Request ${decision}.`);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <Loading />;
  if (requests.length === 0) return <EmptyState title="No pending requests" body="New club registrations will show up here." />;

  return (
    <div className="stack gap-3">
      {msg && <div className="form-success">{msg}</div>}
      {requests.map((r) => (
        <div key={r.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontWeight: 600 }}>{r.club_name}</p>
            <span className="badge badge-neutral">{r.category}</span>
          </div>
          <p className="small muted" style={{ marginBottom: 10 }}>{r.description}</p>
          <div className="row gap-4" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <span className="small faint">Coordinator: {r.faculty_coordinator}</span>
            <span className="small faint">Proposed president: {r.proposed_president_name}</span>
          </div>
          <div className="row gap-3">
            <button className="btn btn-primary btn-sm" onClick={() => review(r.id, 'approved')}>Approve</button>
            <button className="btn btn-ghost btn-sm" onClick={() => review(r.id, 'rejected')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Club leadership is a relation on the clubs table (president_id / vp_id),
// never a role value — this is the one place an admin reassigns it.
function ClubsLeadershipTab(){
 const [clubs,setClubs]=useState([]),[users,setUsers]=useState([]),[teachers,setTeachers]=useState([]),[loading,setLoading]=useState(true),[drafts,setDrafts]=useState({}),[msg,setMsg]=useState('');
 function load(){setLoading(true);Promise.all([api.get('/clubs'),api.get('/admin/users?pageSize=200'),api.get('/admin/teachers')]).then(([c,u,t])=>{setClubs(c.clubs);setUsers(u.users.filter(x=>x.is_active));setTeachers(t.teachers);}).finally(()=>setLoading(false));}
 useEffect(load,[]);function draft(c){return drafts[c.id]||{presidentId:'',vpId:'',coordinatorId:''};}
 async function save(c){const d=draft(c);try{await api.patch(`/admin/clubs/${c.id}/leadership`,{presidentId:d.presidentId||undefined,vpId:d.vpId===''?undefined:(d.vpId==='__clear__'?null:d.vpId),coordinatorId:d.coordinatorId===''?undefined:(d.coordinatorId==='__clear__'?null:d.coordinatorId)});setMsg(`${c.name} leadership updated.`);setDrafts(x=>({...x,[c.id]:undefined}));load();}catch(e){setMsg(e.message);}}
 if(loading)return <Loading/>;return <div><div className="card-flat" style={{marginBottom:18}}><strong>Leadership is scoped per club.</strong><p className="small muted">A person keeps their normal student/teacher identity. Admin appoints the President and Faculty Coordinator; the President can later delegate VP/member access from the club dashboard.</p></div>{msg&&<div className="form-success">{msg}</div>}<div className="stack gap-3">{clubs.map(c=>{const d=draft(c);return <div className="card" key={c.id}><div className="row" style={{justifyContent:'space-between',marginBottom:12}}><div><h3>{c.name}</h3><p className="small muted">Current: {c.president_name} · VP {c.vp_name||'—'} · Coordinator {c.coordinator_name||'—'}</p></div><span className="badge badge-accent">{c.category}</span></div><div className="row gap-3" style={{flexWrap:'wrap'}}><div className="field grow"><label>President</label><select value={d.presidentId} onChange={e=>setDrafts(x=>({...x,[c.id]:{...d,presidentId:e.target.value}}))}><option value="">Keep current</option>{users.map(u=><option value={u.id} key={u.id}>{u.full_name} · {u.email}</option>)}</select></div><div className="field grow"><label>Vice President</label><select value={d.vpId} onChange={e=>setDrafts(x=>({...x,[c.id]:{...d,vpId:e.target.value}}))}><option value="">Keep current</option><option value="__clear__">Remove VP</option>{users.map(u=><option value={u.id} key={u.id}>{u.full_name} · {u.email}</option>)}</select></div><div className="field grow"><label>Faculty Coordinator <span className="optional">(teacher account)</span></label><select value={d.coordinatorId} onChange={e=>setDrafts(x=>({...x,[c.id]:{...d,coordinatorId:e.target.value}}))}><option value="">Keep current</option><option value="__clear__">Remove coordinator</option>{teachers.map(u=><option value={u.id} key={u.id}>{u.full_name} · {u.email}</option>)}</select></div><button className="btn btn-primary btn-sm" disabled={!d.presidentId&&!d.vpId&&!d.coordinatorId} onClick={()=>save(c)}>Save changes</button></div></div>})}</div></div>;
}

function ClassesTeachersTab(){
 const [classes,setClasses]=useState([]),[departments,setDepartments]=useState([]),[teachers,setTeachers]=useState([]),[loading,setLoading]=useState(true),[form,setForm]=useState({department_id:'',year_of_study:'',section:''}),[msg,setMsg]=useState('');
 function load(){setLoading(true);Promise.all([api.get('/admin/classes'),api.get('/admin/departments'),api.get('/admin/teachers')]).then(([c,d,t])=>{setClasses(c.classes);setDepartments(d.departments);setTeachers(t.teachers);}).finally(()=>setLoading(false));}useEffect(load,[]);
 async function create(e){e.preventDefault();try{await api.post('/admin/classes',{...form,year_of_study:Number(form.year_of_study)});setMsg('Class created.');setForm({department_id:'',year_of_study:'',section:''});load();}catch(e){setMsg(e.message);}}
 async function assign(id,teacher_id){try{await api.patch(`/admin/classes/${id}/teacher`,{teacher_id});setMsg('Class teacher assigned.');load();}catch(e){setMsg(e.message);}}
 if(loading)return <Loading/>;return <div><div className="row gap-5" style={{alignItems:'flex-start',flexWrap:'wrap',marginBottom:24}}><form className="card" onSubmit={create} style={{flex:'1 1 300px'}}><h3>Create class/section</h3><p className="small muted" style={{marginBottom:14}}>Students choose from these official options during registration.</p><div className="field"><label>Department</label><select required value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})}><option value="">Select department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select></div><div className="row gap-3"><div className="field grow"><label>Year</label><select required value={form.year_of_study} onChange={e=>setForm({...form,year_of_study:e.target.value})}><option value="">Year</option>{[1,2,3,4].map(y=><option key={y} value={y}>{y}</option>)}</select></div><div className="field grow"><label>Section</label><input required value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="A"/></div></div><button className="btn btn-primary">Create class</button></form><div className="card" style={{flex:'2 1 420px'}}><h3>Class teachers</h3><p className="small muted" style={{marginBottom:14}}>A teacher can send alerts to their assigned class only.</p>{msg&&<div className="form-success">{msg}</div>}<div className="stack gap-2">{classes.map(c=><div key={c.id} className="row" style={{justifyContent:'space-between',gap:12,borderBottom:'1px solid var(--color-border)',padding:'10px 0'}}><div><strong>{c.name}</strong><div className="small muted">{c.teacher_name||'No class teacher assigned'}</div></div><select aria-label={`Assign teacher for ${c.name}`} value={c.teacher_id||''} onChange={e=>assign(c.id,e.target.value)} style={{maxWidth:230}}><option value="">Select teacher…</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>)}</div></div></div></div>;
}

function UsersTab() {
  const [q, setQ] = useState('');
  const roles = ['admin', 'teacher', 'student'];

  const { items: users, loading, loadingMore, hasMore, reload, loadMore } = usePaginatedList(
    (page) => api.get(`/admin/users?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`).then((d) => ({ items: d.users, hasMore: d.hasMore })),
    [q]
  );

  async function changeRole(id, role) {
    await api.patch(`/admin/users/${id}/role`, { role });
    reload();
  }
  async function toggleActive(id, isActive) {
    await api.patch(`/admin/users/${id}/active`, { is_active: !isActive });
    reload();
  }

  return (
    <div>
      <input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 16, maxWidth: 320 }} aria-label="Search users by name or email" />
      {loading ? <Loading /> : (
        <>
          <table>
            <thead><tr><th>Name</th><th>Identity</th><th>Club leadership</th><th>Department</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}<br /><span className="small faint">{u.email}</span></td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ fontSize: 13, padding: '4px 8px' }} aria-label={`Change identity for ${u.full_name}`}>
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="small">
                    {u.presides_over && <div>President: {u.presides_over}</div>}
                    {u.vp_of && <div>VP: {u.vp_of}</div>}
                    {!u.presides_over && !u.vp_of && <span className="faint">—</span>}
                  </td>
                  <td className="small">{u.department || '—'}</td>
                  <td>{u.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-critical">Deactivated</span>}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u.id, u.is_active)}>{u.is_active ? 'Deactivate' : 'Reactivate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <LoadMore hasMore={hasMore} loadingMore={loadingMore} onClick={loadMore} />
        </>
      )}
      <p className="small faint" style={{ marginTop: 16 }}>
        Club leadership is assigned relationally and shown here read-only — reassign it from the "Clubs & Leadership" tab.
      </p>
    </div>
  );
}
function LocationsRoutesTab() {
  const [locations, setLocations] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [locForm, setLocForm] = useState({ name: '', category: 'academic', lat: '', lng: '', description: '' });
  const [edgeForm, setEdgeForm] = useState({ from_location_id: '', to_location_id: '', distance_meters: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/navigation/locations'), api.get('/navigation/edges')])
      .then(([l, e]) => { setLocations(l.locations); setEdges(e.edges); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function addLocation(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/navigation/locations', { ...locForm, lat: Number(locForm.lat), lng: Number(locForm.lng) });
      setLocForm({ name: '', category: 'academic', lat: '', lng: '', description: '' });
      setMsg('Location added.');
      load();
    } catch (err) { setMsg(err.message); }
  }

  async function addEdge(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/navigation/edges', { ...edgeForm, distance_meters: Number(edgeForm.distance_meters) });
      setEdgeForm({ from_location_id: '', to_location_id: '', distance_meters: '' });
      setMsg('Path added.');
      load();
    } catch (err) { setMsg(err.message); }
  }

  if (loading) return <Loading />;

  return (
    <div>
      {msg && <div className="form-success">{msg}</div>}

      <div className="row gap-5" style={{ alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 32 }}>
        <form onSubmit={addLocation} className="card" style={{ flex: '1 1 280px' }}>
          <h3 style={{ marginBottom: 14 }}>Add a location</h3>
          <div className="field"><label htmlFor="loc-name">Name</label><input id="loc-name" required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="loc-category">Category</label>
            <select id="loc-category" value={locForm.category} onChange={(e) => setLocForm({ ...locForm, category: e.target.value })}>
              <option value="academic">Academic</option><option value="admin">Admin</option>
              <option value="food">Food</option><option value="medical">Medical</option>
              <option value="parking">Parking</option><option value="entrance">Entrance</option>
            </select>
          </div>
          <div className="row gap-3">
            <div className="field grow"><label htmlFor="loc-lat">Latitude</label><input id="loc-lat" required type="number" step="any" value={locForm.lat} onChange={(e) => setLocForm({ ...locForm, lat: e.target.value })} /></div>
            <div className="field grow"><label htmlFor="loc-lng">Longitude</label><input id="loc-lng" required type="number" step="any" value={locForm.lng} onChange={(e) => setLocForm({ ...locForm, lng: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary btn-sm">Add location</button>
        </form>

        <form onSubmit={addEdge} className="card" style={{ flex: '1 1 280px' }}>
          <h3 style={{ marginBottom: 14 }}>Add a walking path</h3>
          <div className="field">
            <label htmlFor="edge-from">From</label>
            <select id="edge-from" required value={edgeForm.from_location_id} onChange={(e) => setEdgeForm({ ...edgeForm, from_location_id: e.target.value })}>
              <option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edge-to">To</label>
            <select id="edge-to" required value={edgeForm.to_location_id} onChange={(e) => setEdgeForm({ ...edgeForm, to_location_id: e.target.value })}>
              <option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="edge-distance">Distance (meters)</label><input id="edge-distance" required type="number" value={edgeForm.distance_meters} onChange={(e) => setEdgeForm({ ...edgeForm, distance_meters: e.target.value })} /></div>
          <p className="small faint" style={{ marginBottom: 14 }}>Paths are added in both directions automatically.</p>
          <button className="btn btn-primary btn-sm">Add path</button>
        </form>
      </div>

      <h3 style={{ marginBottom: 14 }}>{locations.length} locations</h3>
      <table style={{ marginBottom: 32 }}>
        <thead><tr><th>Name</th><th>Category</th><th>Coordinates</th></tr></thead>
        <tbody>{locations.map((l) => (
          <tr key={l.id}><td>{l.name}</td><td className="small">{l.category}</td><td className="small faint">{l.lat}, {l.lng}</td></tr>
        ))}</tbody>
      </table>

      <h3 style={{ marginBottom: 14 }}>{edges.length} paths</h3>
      <table>
        <thead><tr><th>From</th><th>To</th><th>Distance</th></tr></thead>
        <tbody>{edges.map((e) => (
          <tr key={e.id}><td>{e.from_name}</td><td>{e.to_name}</td><td className="small">{e.distance_meters} m</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/events?upcoming=false&pageSize=100').then((d) => setEvents(d.events)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (events.length === 0) return <EmptyState title="No events" />;
  return (
    <table>
      <thead><tr><th>Title</th><th>Club</th><th>Category</th><th>Status</th><th>When</th></tr></thead>
      <tbody>{events.map((e) => (
        <tr key={e.id}>
          <td>{e.title}</td><td className="small">{e.club_name}</td>
          <td><CategoryBadge category={e.category} /></td><td><StatusBadge status={e.status} /></td>
          <td className="small faint">{new Date(e.starts_at).toLocaleDateString()}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/announcements?pageSize=100').then((d) => setAnnouncements(d.announcements)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (announcements.length === 0) return <EmptyState title="No announcements yet" />;
  return (
    <table>
      <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Urgency</th><th>Sent</th></tr></thead>
      <tbody>{announcements.map((a) => (
        <tr key={a.id}>
          <td>{a.title}</td><td className="small">{a.author_name}</td>
          <td><CategoryBadge category={a.category} /></td><td><UrgencyBadge urgency={a.urgency} /></td>
          <td className="small faint">{new Date(a.created_at).toLocaleDateString()}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  function load() {
    setLoading(true);
    api.get(`/incidents${status ? `?status=${status}&pageSize=100` : '?pageSize=100'}`).then((d) => setIncidents(d.incidents)).finally(() => setLoading(false));
  }
  useEffect(load, [status]);

  async function verify(id, decision) {
    setMsg('');
    try {
      const res = await api.post(`/incidents/${id}/verify`, { decision });
      setMsg(decision === 'verify' ? `Verified.${res.reroutedSessions ? ` ${res.reroutedSessions} route(s) updated.` : ''}` : 'Rejected.');
      load();
    } catch (err) { setMsg(err.message); }
  }

  const filters = [
    { v: '', label: 'All' }, { v: 'unverified', label: 'Unverified' },
    { v: 'community_verified', label: 'Community Verified' }, { v: 'officially_verified', label: 'Officially Verified' },
  ];

  return (
    <div>
      <div className="pill-tabs" style={{ marginBottom: 20 }}>
        {filters.map((f) => <button key={f.v} className={`pill-tab ${status === f.v ? 'active' : ''}`} onClick={() => setStatus(f.v)}>{f.label}</button>)}
      </div>
      {msg && <div className="form-success">{msg}</div>}
      {loading ? <Loading /> : incidents.length === 0 ? <EmptyState title="No reports in this category" /> : (
        <div className="stack gap-3">
          {incidents.map((i) => (
            <div key={i.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <StatusBadge status={i.status} />
                <span className="small faint">{i.confirm_count} confirmed · {i.confidence_score}% confidence</span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{i.title}</p>
              <p className="small muted" style={{ marginBottom: 12 }}>{i.description}</p>
              {i.status !== 'officially_verified' && i.status !== 'rejected' && (
                <div className="row gap-3">
                  <button className="btn btn-primary btn-sm" onClick={() => verify(i.id, 'verify')}>Officially verify</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => verify(i.id, 'reject')}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/notifications-summary').then((d) => setBatches(d.batches)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (batches.length === 0) return <EmptyState title="No notifications sent yet" />;
  return (
    <table>
      <thead><tr><th>Title</th><th>Type</th><th>Urgency</th><th>Recipients</th><th>Sent</th></tr></thead>
      <tbody>{batches.map((b, i) => (
        <tr key={i}>
          <td>{b.title}</td>
          <td className="small">{b.type}</td>
          <td><UrgencyBadge urgency={b.urgency} /></td>
          <td className="small" style={{ fontWeight: 600 }}>{b.recipients}</td>
          <td className="small faint">{new Date(b.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

const ACTION_LABELS = {
  'club_request.approved': 'Club approved',
  'club_request.rejected': 'Club rejected',
  'user.role_changed': 'Role changed',
  'user.deactivated': 'Account deactivated',
  'user.reactivated': 'Account reactivated',
  'club.leadership_changed': 'Leadership reassigned',
  'incident.officially_verified': 'Report verified',
  'incident.rejected': 'Report rejected',
};

function AuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/audit-log').then((d) => setEntries(d.entries)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (entries.length === 0) return <EmptyState title="No activity recorded yet" body="Sensitive actions — approvals, role changes, verifications — will show up here." />;
  return (
    <table>
      <thead><tr><th>Action</th><th>Details</th><th>By</th><th>When</th></tr></thead>
      <tbody>{entries.map((e) => (
        <tr key={e.id}>
          <td className="small" style={{ fontWeight: 600 }}>{ACTION_LABELS[e.action] || e.action}</td>
          <td className="small muted">{e.details || '—'}</td>
          <td className="small">{e.actor_name || 'System'}</td>
          <td className="small faint">{new Date(e.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <div className="container page">
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Admin</h1>
      <div className="pill-tabs" style={{ marginBottom: 28 }}>
        {TABS.map((t) => <button key={t} className={`pill-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Student Approvals' && <StudentApprovalsTab />}
      {tab === 'Club Approvals' && <ClubApprovalsTab />}
      {tab === 'Clubs & Leadership' && <ClubsLeadershipTab />}
      {tab === 'Classes & Teachers' && <ClassesTeachersTab />}
      {tab === 'Users' && <UsersTab />}
      {tab === 'Locations & Routes' && <LocationsRoutesTab />}
      {tab === 'Events' && <EventsTab />}
      {tab === 'Incidents' && <IncidentsTab />}
      {tab === 'Announcements' && <AnnouncementsTab />}
      {tab === 'Notifications' && <NotificationsTab />}
      {tab === 'Audit Log' && <AuditLogTab />}
    </div>
  );
}
