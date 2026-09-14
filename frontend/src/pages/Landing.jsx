import React from 'react';
import {Link} from 'react-router-dom';

const features=[
  ['01','LIVE ALERTS','Time-critical announcements reach the people who actually need them.','feature-blue'],
  ['02','VERIFY','Students can report and confirm changes before they become official.','feature-violet'],
  ['03','NAVIGATE','Official campus locations and walking paths turn a change into a clear next step.','feature-green'],
  ['04','CAMPUS LIFE','Clubs, workshops, drives and events stay visible instead of getting buried in chats.','feature-peach'],
];

export default function Landing(){
  return <main>
    <section className="landing-hero landing-hero-premium">
      <div className="container landing-hero-grid">
        <div className="landing-copy">
          <div className="hero-kicker">DISCOVER · VERIFY · NAVIGATE · ACT</div>
          <div className="eyebrow" style={{marginTop:18}}>Built for a connected campus</div>
          <h1 className="hero-title">Campus information should never feel like a scavenger hunt.</h1>
          <p className="hero-copy">CampusPulse+ brings verified alerts, student reports, club communication, events and campus navigation into one clear place — with a focus on what someone should do next.</p>
          <div className="row gap-3" style={{marginTop:28,flexWrap:'wrap'}}>
            <Link className="btn btn-primary btn-lg" to="/register">Register for CampusPulse+</Link>
            <Link className="btn btn-secondary btn-lg" to="/clubs">Explore campus life</Link>
          </div>
          <div className="hero-trust-row">
            <span className="hero-trust-chip"><b>✓</b> College approval</span>
            <span className="hero-trust-chip"><b>⚡</b> Real-time updates</span>
            <span className="hero-trust-chip"><b>⌖</b> Campus routes</span>
          </div>
        </div>
        <div className="landing-photo-wrap">
          <div className="landing-photo-badge"><span>MVJCE</span><small>Whitefield · Bengaluru</small></div>
          <img className="landing-campus-photo" src="https://mvjce.edu.in/wp-content/uploads/2024/03/vibrant-campus-culture.webp" alt="Students on campus at MVJ College of Engineering" />
          <div className="landing-photo-caption"><strong>MVJ College of Engineering</strong><span>One connected campus experience.</span></div>
        </div>
      </div>
    </section>

    <section className="container landing-stats landing-stats-premium">
      <div><strong>One place</strong><span>for campus communication</span></div>
      <div><strong>Targeted</strong><span>by department, class or club</span></div>
      <div><strong>Real-time</strong><span>notifications and route updates</span></div>
      <div><strong>Verified</strong><span>community + official review</span></div>
    </section>

    <section className="section-rule"><div className="container" style={{padding:'72px 0'}}>
      <div className="section-intro"><div><div className="eyebrow">Why CampusPulse+</div><h2 style={{marginTop:8}}>More useful than another notice board.</h2></div><p className="muted">The product connects the message, the audience and the action instead of leaving students to figure out the next step themselves.</p></div>
      <div className="feature-grid feature-grid-premium">{features.map(([num,title,body,tone])=><article className={`feature-card ${tone}`} key={title}><span>{num}</span><h3>{title}</h3><p>{body}</p><div className="feature-arrow">↗</div></article>)}</div>
    </div></section>

    <section className="workflow-section"><div className="container workflow-grid">
      <div><div className="eyebrow" style={{color:'#bcd0ff'}}>THE SIGNATURE EXPERIENCE</div><h2>When something changes, the platform connects the dots.</h2><p>Imagine an exam venue moving from Auditorium 1 to Auditorium 2. Students receive the alert, the event destination changes, and an active navigation session can recalculate the route automatically.</p><div className="workflow-list"><div><b>01</b><span>Official update reaches affected students.</span></div><div><b>02</b><span>The new destination becomes the source of truth.</span></div><div><b>03</b><span>The route changes without making the student search again.</span></div></div></div>
      <div className="workflow-visual"><img src="/assets/map-illustration.svg" alt="CampusPulse+ campus route illustration"/><div className="workflow-mini-card"><span className="badge badge-critical">IMPORTANT</span><strong>Auditorium 1 → Auditorium 2</strong><small>Route updated automatically</small></div></div>
    </div></section>

    <section className="section-rule"><div className="container" style={{padding:'68px 0'}}>
      <div className="callout callout-premium"><div><div className="eyebrow">Institution-ready architecture</div><h2>One platform. Different permissions. One campus.</h2><p className="muted" style={{marginTop:8,maxWidth:720}}>Students, faculty, club teams and administrators each see the tools and alerts relevant to their responsibility.</p></div><Link className="btn btn-primary" to="/login">Sign in</Link></div>
    </div></section>
  </main>
}
