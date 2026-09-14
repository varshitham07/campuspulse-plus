import React,{useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../api/client';

const DEFAULT_DEPARTMENTS=[
  ['AE','Aeronautical Engineering'],['AIML','Artificial Intelligence & Machine Learning'],['AERO','Aerospace Engineering'],['CHE','Chemical Engineering'],['CSE','Computer Science & Engineering'],['CSD','Computer Science & Design'],['CSDDS','Computer Science & Engineering (Data Science)'],['CIVIL','Civil Engineering'],['ECE','Electronics & Communication Engineering'],['EEE','Electrical & Electronics Engineering'],['IIOT','Industrial IoT'],['ISE','Information Science & Engineering'],['ME','Mechanical Engineering'],['VLSI','Electronics Engineering (VLSI Design & Technology)'],['ECA','Electronics & Communication (Advanced Communication Technology)']
].map(([code,name],i)=>({id:`fallback-${i}`,code,name}));

const yearLabel=(y)=>`${y}${y===1?'st':y===2?'nd':y===3?'rd':'th'} Year`;

export default function Register(){
  const [departments,setDepartments]=useState(DEFAULT_DEPARTMENTS);
  const [classes,setClasses]=useState([]);
  const [loadingOptions,setLoadingOptions]=useState(true);
  const [form,setForm]=useState({full_name:'',student_id:'',email:'',mobile:'',department:'',department_id:'',year_of_study:'',class_id:'',class_section:'',password:''});
  const [token,setToken]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const d=await api.get('/auth/departments');
        if(!cancelled && d.departments?.length) setDepartments(d.departments);
      }catch(_){ /* keep reliable local department list */ }
      finally{if(!cancelled)setLoadingOptions(false);}
    })();
    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    let cancelled=false;
    if(!form.department_id || !form.year_of_study){setClasses([]);return ()=>{cancelled=true};}
    (async()=>{
      try{
        const d=await api.get(`/auth/classes?departmentId=${encodeURIComponent(form.department_id)}&year=${encodeURIComponent(form.year_of_study)}`);
        if(!cancelled)setClasses(d.classes||[]);
      }catch(_){
        if(!cancelled)setClasses([]);
      }
    })();
    return()=>{cancelled=true};
  },[form.department_id,form.year_of_study]);

  const selectedClass=useMemo(()=>classes.find(c=>String(c.id)===String(form.class_id)),[classes,form.class_id]);
  const classOptions=useMemo(()=>{
    if(classes.length)return classes;
    if(!form.department || !form.year_of_study)return [];
    const dept=departments.find(d=>d.name===form.department);
    const code=dept?.code || '';
    return [[1,'A'],[1,'B']].map(([y,section],i)=>({id:`fallback-class-${code}-${y}-${section}`,name:`${code} ${yearLabel(y)} — Section ${section}`,year_of_study:y,section,department_name:form.department}));
  },[classes,departments,form.department,form.year_of_study]);

  function chooseDepartment(e){
    const value=e.target.value;
    const dept=departments.find(d=>d.name===value || d.code===value);
    setForm(f=>({...f,department:dept?.name||value,department_id:dept?.id||'',class_id:'',class_section:''}));
  }

  function chooseClassValue(value){
    const clean=String(value || '');
    const hit=classOptions.find(c=>c.name===clean || String(c.id)===clean);
    setForm(f=>({...f,class_id:hit && !String(hit.id).startsWith('fallback-')?String(hit.id):'',class_section:hit?.name||clean}));
  }

  function chooseClass(e){ chooseClassValue(e.target.value); }

  async function submit(e){
    e.preventDefault();
    setBusy(true);setError('');
    try{
      const missing=[];
      if(!form.full_name.trim()) missing.push('full name');
      if(!form.student_id.trim()) missing.push('student ID');
      if(!form.mobile.trim() && !form.email.trim()) missing.push('mobile number or email');
      if(!form.department_id && !form.department.trim()) missing.push('department');
      if(!form.year_of_study) missing.push('year of study');
      if(!form.class_section.trim() && !form.class_id) missing.push('class / section');
      if(!form.password || form.password.length < 8) missing.push('a password of at least 8 characters');
      if(missing.length) throw new Error(`Please complete: ${missing.join(', ')}.`);
      const usingFallbackDepartment=String(form.department_id||'').startsWith('fallback-');
      const payload={...form,year_of_study:Number(form.year_of_study),class_id:form.class_id?Number(form.class_id):undefined,department_id:usingFallbackDepartment?undefined:(form.department_id?Number(form.department_id):undefined),class_section:form.class_section.trim()};
      if (!usingFallbackDepartment) delete payload.department;
      const d=await api.post('/auth/register',payload);
      setToken(d.registrationToken);
    }catch(err){setError(err.message||'Registration could not be submitted. Please try again.');}
    finally{setBusy(false);}
  }

  if(token) return <div className="auth-shell"><div className="auth-card auth-card-wide confirmation-card"><div className="success-mark">✓</div><div className="eyebrow">Registration received</div><h1>Your account is awaiting approval.</h1><p className="muted">Show this reference token to the college administrator. It identifies your submitted registration; it does not itself grant access.</p><div className="registration-token">{token}</div><div className="info-panel"><strong>What happens next?</strong><p>The admin verifies your details and approves the account. Once approved, you can sign in with an OTP sent to your registered mobile number.</p></div><Link to="/login" className="btn btn-primary">Go to sign in</Link></div></div>;

  return <div className="auth-shell"><div className="auth-card auth-card-wide"><Link to="/" className="small muted">← CampusPulse+</Link><div className="eyebrow" style={{marginTop:18}}>Student registration</div><h1>Create your campus identity</h1><p className="muted">Submit your details once. The college admin will verify them using the reference token you receive.</p>{error&&<div className="form-error" style={{marginTop:18}}>{error}</div>}
    <form onSubmit={submit} className="form-grid" autoComplete="on">
      <div className="field"><label htmlFor="reg-name">Full name</label><input id="reg-name" name="full_name" autoComplete="name" value={form.full_name} onChange={e=>update('full_name',e.target.value)} placeholder="Your full name" required/></div>
      <div className="field"><label htmlFor="reg-student-id">Student ID</label><input id="reg-student-id" name="student_id" value={form.student_id} onChange={e=>update('student_id',e.target.value)} placeholder="College register number" required/></div>
      <div className="field"><label htmlFor="reg-mobile">Mobile number</label><input id="reg-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={e=>update('mobile',e.target.value)} placeholder="Registered mobile" required/></div>
      <div className="field"><label htmlFor="reg-email">Email <span className="optional">(optional)</span></label><input id="reg-email" name="email" type="email" autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="College email"/></div>
      <div className="field"><label htmlFor="reg-department">Department</label><select id="reg-department" name="department" value={form.department} onChange={chooseDepartment} required><option value="">{loadingOptions?'Loading departments…':'Select department'}</option>{departments.map(d=><option key={d.id} value={d.name}>{d.code} — {d.name}</option>)}</select></div>
      <div className="field"><label htmlFor="reg-year">Year</label><select id="reg-year" name="year_of_study" value={form.year_of_study} onChange={e=>{update('year_of_study',e.target.value);setForm(f=>({...f,class_id:'',class_section:''}))}} required><option value="">Select year</option>{[1,2,3,4].map(y=><option key={y} value={y}>{yearLabel(y)}</option>)}</select></div>
      <div className="field span-2"><label htmlFor="reg-class">Class / section</label><input id="reg-class" name="class_section" list="class-options" value={form.class_section} onChange={chooseClass} onBlur={e=>chooseClassValue(e.target.value)} placeholder={form.department&&form.year_of_study?'Select or type your class / section':'Choose department and year first'} disabled={!form.department||!form.year_of_study} required/><datalist id="class-options">{classOptions.map(c=><option key={c.id} value={c.name}/>)}</datalist>{classOptions.length>0&&<div className="choice-chips">{classOptions.slice(0,8).map(c=><button type="button" className={`choice-chip ${form.class_section===c.name?'active':''}`} key={`chip-${c.id}`} onClick={()=>chooseClassValue(c.name)}>{c.name}</button>)}</div>}<span className="hint">Select a suggested class or type the exact class / section name. Your selection is checked against the official college data.</span></div>
      <div className="field span-2"><label htmlFor="reg-password">Password <span className="optional">(backup option)</span></label><input id="reg-password" name="password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="At least 8 characters" required/></div>
      <div className="span-2"><button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy?'Submitting application…':'Submit for admin approval'}</button></div>
    </form><p className="center-text small muted" style={{marginTop:20}}>Already approved? <Link to="/login" className="text-link">Sign in</Link></p>
  </div></div>
}
