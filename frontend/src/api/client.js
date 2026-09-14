const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
let refreshPromise = null;

function getToken() { return localStorage.getItem('cp_token'); }
function setToken(token) { if (token) localStorage.setItem('cp_token', token); else localStorage.removeItem('cp_token'); }

async function rawRequest(path, { method='GET', body, auth=true }={}) {
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type']='application/json';
  const token=getToken(); if(auth&&token) headers.Authorization=`Bearer ${token}`;
  let res;
  try {
    res=await fetch(`${BASE}${path}`,{method,headers,body:body===undefined?undefined:(body instanceof FormData?body:JSON.stringify(body)),credentials:'include'});
  } catch (networkErr) {
    const error=new Error('Cannot reach the CampusPulse+ server. Make sure the backend is running on port 4000.');
    error.cause=networkErr; error.status=0; throw error;
  }
  let data=null; try{data=await res.json();}catch(_){ data={}; }
  return {res,data};
}
async function refreshSession(){
  if(!refreshPromise){
    refreshPromise=(async()=>{const {res,data}=await rawRequest('/auth/refresh',{method:'POST',auth:false});if(!res.ok||!data?.token)throw new Error('Session expired');setToken(data.token);return data;})().finally(()=>{refreshPromise=null;});
  }
  return refreshPromise;
}
async function request(path,{method='GET',body,auth=true,retry=true}={}){
  const {res,data}=await rawRequest(path,{method,body,auth});
  if(res.status===401&&auth&&retry){
    try{await refreshSession();return request(path,{method,body,auth,retry:false});}
    catch(_){setToken(null);}
  }
  if(!res.ok){const message=data?.error || data?.message || `Request failed (${res.status}). Please try again.`;const error=new Error(message);error.status=res.status;throw error;}
  return data;
}
async function upload(path,formData){
  const {res,data}=await rawRequest(path,{method:'POST',body:formData,auth:true});
  if(res.status===401){await refreshSession();return upload(path,formData);}
  if(!res.ok){const error=new Error(data?.error||'Upload failed. Please try again.');error.status=res.status;throw error;}
  return data;
}
export const api={
  get:path=>request(path), post:(path,body)=>request(path,{method:'POST',body}), patch:(path,body)=>request(path,{method:'PATCH',body}), del:path=>request(path,{method:'DELETE'}), upload,getToken,setToken,refresh:refreshSession
};
