import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../api/client';
import {Loading,EmptyState,ErrorState} from '../components/States';

const images=['/assets/club-illustration.svg','/assets/campus-hero.svg','/assets/map-illustration.svg'];
export default function Clubs(){
  const [clubs,setClubs]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [q,setQ]=useState('');
  function load(){setLoading(true);api.get('/clubs').then(d=>setClubs(d.clubs)).catch(()=>setError(true)).finally(()=>setLoading(false));}useEffect(load,[]);
  const filtered=clubs.filter(c=>`${c.name} ${c.category} ${c.description}`.toLowerCase().includes(q.toLowerCase()));
  return <div className="container page">
    <section className="clubs-hero"><div><div className="eyebrow">Campus life</div><h1>Find your people.</h1><p className="muted" style={{maxWidth:560,fontSize:17}}>Discover technical, cultural and student communities, see what's happening next, and join the clubs that make campus feel like yours.</p><div className="row gap-3" style={{marginTop:24,flexWrap:'wrap'}}><Link className="btn btn-primary btn-lg" to="/clubs/register">Register a club</Link><Link className="btn btn-secondary btn-lg" to="/events">Explore events</Link></div></div><img src="/assets/club-illustration.svg" alt="Students collaborating in a campus club"/></section>
    <div className="row" style={{justifyContent:'space-between',gap:16,marginBottom:18,flexWrap:'wrap'}}><div><h2>Official campus clubs</h2><p className="small muted">Join one or more communities; leadership access stays scoped to each club.</p></div><input aria-label="Search clubs" placeholder="Search clubs…" value={q} onChange={e=>setQ(e.target.value)} style={{width:260}}/></div>
    {loading&&<Loading/>}{error&&<ErrorState onRetry={load}/>} {!loading&&!error&&!filtered.length&&<EmptyState title="No matching clubs" body={q?'Try another search.':'New official clubs will appear here.'}/>} {!loading&&!error&&filtered.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:18}}>{filtered.map((c,i)=><Link key={c.id} to={`/clubs/${c.id}`} className="club-card card-interactive"><div className="club-card-image"><img src={images[i%images.length]} alt=""/></div><div className="club-card-body"><div className="club-meta"><span className="badge badge-accent">{c.category}</span><span className="small faint">{c.member_count} member{c.member_count===1?'':'s'}</span></div><div className="club-title">{c.name}</div><p className="small muted" style={{display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{c.description}</p><div className="club-card-footer"><span className="small muted">President: {c.president_name}</span><span className="text-link">View →</span></div></div></Link>)}</div>}
  </div>
}
