import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading } from '../components/States';

const QUICK_DESTINATIONS = [
  { name: 'Auditorium 1', note: 'Main auditorium — orientation sessions are usually here' },
  { name: 'Seminar Hall', note: 'Guest lectures and workshops' },
  { name: 'Library', note: 'Open 6am–11pm' },
  { name: 'Admin Office', note: 'Registrar, ID cards, official paperwork' },
  { name: 'Placement Cell', note: 'Career services and recruiter visits' },
  { name: 'Medical Room', note: 'First aid and campus nurse' },
  { name: 'Canteen', note: 'Main dining hall' },
];

export default function NewStudentMode() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/navigation/locations').then((d) => setLocations(d.locations)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container page"><Loading /></div>;

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <span className="badge badge-accent" style={{ marginBottom: 16 }}>New to campus?</span>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>We'll help you find your way.</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Pick a destination below and we'll calculate a walking route from wherever you tell us you're starting.
      </p>

      <div className="stack gap-3">
        {QUICK_DESTINATIONS.map((dest) => {
          const loc = locations.find((l) => l.name === dest.name);
          return (
            <div key={dest.name} className="card row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{dest.name}</p>
                <p className="small muted">{dest.note}</p>
              </div>
              {loc && (
                <Link to={`/map?to=${loc.id}`} className="btn btn-secondary btn-sm">Take me there</Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="divider" />

      <p className="small muted" style={{ textAlign: 'center' }}>
        Prefer to explore on your own? <Link to="/map" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Open the full campus map</Link>
      </p>
    </div>
  );
}
