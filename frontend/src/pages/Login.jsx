import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountType, setAccountType] = useState('student');
  const [mode, setMode] = useState('otp');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('admin@campuspulse.dev');
  const [password, setPassword] = useState('Password123!');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = () => navigate(location.state?.from || '/dashboard', { replace: true });
  const clear = () => { setError(''); setMessage(''); };

  function switchAccount(type) {
    setAccountType(type);
    clear();
    if (type === 'student') setMode('otp');
    else setMode('password');
    if (type === 'admin') { setEmail('admin@campuspulse.dev'); setPassword('Password123!'); }
    else { setEmail(''); setPassword(''); }
  }

  async function sendOtp(e) {
    e.preventDefault(); setBusy(true); clear();
    try {
      const d = await requestOtp(identifier);
      setMessage(`OTP sent to ${d.destinationMasked}. ${d.devCode ? `Development OTP: ${d.devCode}` : ''}`);
      setMode('verify');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function submitOtp(e) {
    e.preventDefault(); setBusy(true); clear();
    try { await verifyOtp(identifier, code); go(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function passwordLogin(e) {
    e.preventDefault(); setBusy(true); clear();
    try { await login(email.trim(), password); go(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const title = accountType === 'admin' ? 'Administrator sign in' : accountType === 'faculty' ? 'Faculty sign in' : 'Welcome back';
  const subtitle = accountType === 'admin'
    ? 'Manage approvals, classes, clubs, alerts and the campus system.'
    : accountType === 'faculty'
      ? 'Access department and assigned-class communication tools.'
      : 'Only college-approved student accounts can sign in.';

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-story">
          <span className="hero-kicker">CAMPUSPULSE+</span>
          <h1>One campus. The right message. The right people.</h1>
          <p>Verified alerts, events, clubs and navigation connected through one institution-owned platform.</p>
          <img src="/assets/campus-hero.svg" alt="CampusPulse+ campus illustration" />
        </section>

        <section className="auth-card">
          <div className="eyebrow">Secure campus access</div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>

          <div className="segmented auth-type-switch" role="tablist" aria-label="Account type">
            <button type="button" className={accountType === 'student' ? 'active' : ''} onClick={() => switchAccount('student')}>Student</button>
            <button type="button" className={accountType === 'faculty' ? 'active' : ''} onClick={() => switchAccount('faculty')}>Faculty</button>
            <button type="button" className={accountType === 'admin' ? 'active' : ''} onClick={() => switchAccount('admin')}>Admin</button>
          </div>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          {accountType === 'student' && (
            <>
              <div className="segmented" role="tablist" aria-label="Student sign in method">
                <button type="button" className={mode === 'otp' || mode === 'verify' ? 'active' : ''} onClick={() => { setMode('otp'); clear(); }}>OTP login</button>
                <button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => { setMode('password'); clear(); }}>Password</button>
              </div>

              {(mode === 'otp' || mode === 'verify') && (
                <form onSubmit={mode === 'verify' ? submitOtp : sendOtp}>
                  <div className="field"><label htmlFor="login-identifier">Registered mobile or email</label><input id="login-identifier" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="10-digit mobile or college email" required disabled={mode === 'verify'} /></div>
                  {mode === 'verify' && <div className="field"><label htmlFor="login-otp">One-time password</label><input id="login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" required /></div>}
                  <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? (mode === 'verify' ? 'Verifying…' : 'Sending OTP…') : (mode === 'verify' ? 'Continue to CampusPulse+' : 'Send OTP')}</button>
                  {mode === 'verify' && <button type="button" className="btn btn-ghost btn-block" onClick={() => setMode('otp')} disabled={busy}>Use a different account</button>}
                </form>
              )}

              {mode === 'password' && (
                <form onSubmit={passwordLogin}>
                  <div className="field"><label htmlFor="login-student-email">Email</label><input id="login-student-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" required /></div>
                  <div className="field"><label htmlFor="login-student-password">Password</label><input id="login-student-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required /></div>
                  <button className="btn btn-secondary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
                </form>
              )}
            </>
          )}

          {accountType !== 'student' && (
            <form onSubmit={passwordLogin}>
              <div className="field"><label htmlFor="login-staff-email">Institutional email</label><input id="login-staff-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder={accountType === 'admin' ? 'admin@college.edu' : 'faculty@college.edu'} required /></div>
              <div className="field"><label htmlFor="login-staff-password">Password</label><input id="login-staff-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Account password" required /></div>
              <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${accountType === 'admin' ? 'Admin' : 'Faculty'}`}</button>
              {accountType === 'admin' && process.env.NODE_ENV !== 'production' && <div className="dev-credentials"><strong>Local development admin</strong><span>admin@campuspulse.dev</span><span>Password123!</span></div>}
            </form>
          )}

          <div className="auth-note"><strong>New student?</strong><span>Register yourself, receive a reference token, and show it to the college admin for approval.</span><Link to="/register" className="text-link">Start registration →</Link></div>
        </section>
      </div>
    </div>
  );
}
