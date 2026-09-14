import React,{createContext,useContext,useEffect,useState,useCallback} from 'react';
import {api} from '../api/client';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(null);const [clubLeadership,setClubLeadership]=useState([]);const [loading,setLoading]=useState(true);
  const applySession=useCallback(({user,clubLeadership,token})=>{if(token)api.setToken(token);setUser(user||null);setClubLeadership(clubLeadership||[]);},[]);
  const loadSession=useCallback(async()=>{
    try{const session=await api.get('/auth/me');applySession(session);}
    catch(_){try{const session=await api.refresh();applySession(session);}catch(__){api.setToken(null);setUser(null);setClubLeadership([]);}}
    finally{setLoading(false);}
  },[applySession]);
  useEffect(()=>{loadSession();},[loadSession]);
  async function login(email,password){const session=await api.post('/auth/login',{email,password});applySession(session);return session.user;}
  async function requestOtp(identifier){return api.post('/auth/request-otp',{identifier});}
  async function verifyOtp(identifier,code){const session=await api.post('/auth/verify-otp',{identifier,code});applySession(session);return session.user;}
  async function register(payload){return api.post('/auth/register',payload);}
  async function logout(){try{await api.post('/auth/logout',{});}catch(_){ }api.setToken(null);setUser(null);setClubLeadership([]);}
  const value={user,loading,login,requestOtp,verifyOtp,register,logout,isAuthenticated:!!user,hasRole:(...roles)=>!!user&&roles.includes(user.role),clubLeadership,isClubLeader:clubLeadership.length>0,leadsClub:id=>clubLeadership.some(c=>c.club_id===Number(id)),refreshSession:loadSession};
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used within AuthProvider');return ctx;}
