const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { notify, notifyUser } = require('../services/notification.service');
const { logAction } = require('../services/audit.service');

const LEADER_ROLES = ['president','vice_president','faculty_coordinator','member_manager'];

async function hasClubAccess(userId, clubId) {
  const [rows] = await pool.query(`SELECT ca.assignment_role FROM club_assignments ca JOIN clubs c ON c.id=ca.club_id WHERE ca.club_id=:clubId AND ca.user_id=:userId AND c.is_active=TRUE`, { clubId, userId });
  return rows;
}

async function listClubs(req,res,next){
  try{
    const [rows]=await pool.query(`SELECT c.id,c.name,c.category,c.description,c.contact_email,
      p.full_name AS president_name,v.full_name AS vp_name,fc.full_name AS coordinator_name,
      (SELECT COUNT(*) FROM club_members m WHERE m.club_id=c.id) AS member_count
      FROM clubs c
      JOIN users p ON p.id=c.president_id
      LEFT JOIN users v ON v.id=c.vp_id
      LEFT JOIN users fc ON fc.id=c.faculty_coordinator_id
      WHERE c.is_active=TRUE ORDER BY c.name`);
    res.json({clubs:rows});
  }catch(err){next(err);}
}

async function myClub(req,res,next){
  try{
    const [rows]=await pool.query(`SELECT c.*,p.full_name AS president_name,v.full_name AS vp_name,fc.full_name AS coordinator_name
      FROM clubs c JOIN users p ON p.id=c.president_id LEFT JOIN users v ON v.id=c.vp_id LEFT JOIN users fc ON fc.id=c.faculty_coordinator_id
      WHERE c.is_active=TRUE AND EXISTS (SELECT 1 FROM club_assignments ca WHERE ca.club_id=c.id AND ca.user_id=:uid AND ca.assignment_role IN ('president','vice_president','faculty_coordinator','member_manager'))`,{uid:req.user.id});
    const club=rows[0]||null;
    if(!club) return res.json({club:null,assignments:[]});
    const [assignments]=await pool.query(`SELECT ca.id,ca.user_id,ca.assignment_role,u.full_name,u.email,u.role AS identity_role FROM club_assignments ca JOIN users u ON u.id=ca.user_id WHERE ca.club_id=:clubId ORDER BY FIELD(ca.assignment_role,'president','vice_president','faculty_coordinator','member_manager'),u.full_name`,{clubId:club.id});
    res.json({club,assignments});
  }catch(err){next(err);}
}

async function getClub(req,res,next){
  try{
    const [rows]=await pool.query(`SELECT c.*,p.full_name AS president_name,v.full_name AS vp_name,fc.full_name AS coordinator_name
      FROM clubs c JOIN users p ON p.id=c.president_id LEFT JOIN users v ON v.id=c.vp_id LEFT JOIN users fc ON fc.id=c.faculty_coordinator_id WHERE c.id=:id`,{id:req.params.id});
    if(!rows[0]) throw new ApiError(404,'Club not found.');
    const [events]=await pool.query(`SELECT id,title,category,starts_at,status FROM events WHERE club_id=:id AND starts_at>NOW() AND status!='cancelled' ORDER BY starts_at LIMIT 10`,{id:req.params.id});
    const [links]=await pool.query(`SELECT id,label,url FROM club_links WHERE club_id=:id ORDER BY position,id LIMIT 8`,{id:req.params.id});
    res.json({club:rows[0],upcomingEvents:events,links});
  }catch(err){next(err);}
}

async function myMemberships(req,res,next){
  try{
    const [rows]=await pool.query(`SELECT c.id,c.name,c.category,(SELECT COUNT(*) FROM events ev WHERE ev.club_id=c.id AND ev.starts_at>NOW() AND ev.status='scheduled') AS upcoming_event_count FROM club_members m JOIN clubs c ON c.id=m.club_id WHERE m.user_id=:uid AND c.is_active=TRUE ORDER BY c.name`,{uid:req.user.id});
    res.json({clubs:rows});
  }catch(err){next(err);}
}
async function joinClub(req,res,next){try{await pool.query('INSERT IGNORE INTO club_members (club_id,user_id) VALUES (:clubId,:userId)',{clubId:req.params.id,userId:req.user.id});res.status(201).json({message:'Joined club.'});}catch(err){next(err);}}
async function leaveClub(req,res,next){try{await pool.query('DELETE FROM club_members WHERE club_id=:id AND user_id=:uid',{id:req.params.id,uid:req.user.id});res.json({message:'Left club.'});}catch(err){next(err);}}

async function updateClub(req,res,next){
  try{
    const clubId=Number(req.params.id);
    if(req.user.role!=='admin' && !(await hasClubAccess(req.user.id,clubId)).length) throw new ApiError(403,'You can only edit your own club.');
    const fields=['description','contact_email','category'];
    const updates=[]; const params={id:clubId};
    for(const f of fields) if(req.body[f]!==undefined){updates.push(`${f}=:${f}`);params[f]=req.body[f];}
    if(!updates.length) throw new ApiError(400,'No changes provided.');
    await pool.query(`UPDATE clubs SET ${updates.join(', ')} WHERE id=:id`,params); res.json({message:'Club profile updated.'});
  }catch(err){next(err);}
}

async function listAssignments(req,res,next){
  try{
    const clubId=Number(req.params.id);
    if(req.user.role!=='admin' && !(await hasClubAccess(req.user.id,clubId)).length) throw new ApiError(403,'You can only view your own club assignments.');
    const [rows]=await pool.query(`SELECT ca.id,ca.user_id,ca.assignment_role,u.full_name,u.email,u.role AS identity_role FROM club_assignments ca JOIN users u ON u.id=ca.user_id WHERE ca.club_id=:clubId ORDER BY FIELD(ca.assignment_role,'president','vice_president','faculty_coordinator','member_manager'),u.full_name`,{clubId});
    res.json({assignments:rows});
  }catch(err){next(err);}
}

async function listAssignmentCandidates(req,res,next){
 try{
  const clubId=Number(req.params.id); if(req.user.role!=='admin' && !(await hasClubAccess(req.user.id,clubId)).length) throw new ApiError(403,'You can only manage your own club.');
  const q=String(req.query.q||'').trim();const params={};let where="u.is_active=TRUE AND u.approval_status='approved'";
  if(q){where+=' AND (u.full_name LIKE :q OR u.email LIKE :q OR u.student_id LIKE :q)';params.q=`%${q}%`;}
  const [rows]=await pool.query(`SELECT u.id,u.full_name,u.email,u.role, u.department,u.year_of_study FROM users u WHERE ${where} ORDER BY u.full_name LIMIT 100`,params);
  res.json({candidates:rows});
 }catch(err){next(err);}
}

async function assignClubMember(req,res,next){
  try{
    const clubId=Number(req.params.id); const {user_id,assignment_role}=req.body;
    if(!user_id || !LEADER_ROLES.includes(assignment_role)) throw new ApiError(400,'Choose a valid person and club responsibility.');
    const [clubRows]=await pool.query('SELECT id,president_id,faculty_coordinator_id FROM clubs WHERE id=:clubId AND is_active=TRUE',{clubId});
    const club=clubRows[0]; if(!club) throw new ApiError(404,'Club not found.');
    const isAdmin=req.user.role==='admin';
    const access=(await hasClubAccess(req.user.id,clubId)).map(r=>r.assignment_role);
    if(!isAdmin && !access.includes('president')) throw new ApiError(403,'Only the club President can delegate club access.');
    if(assignment_role==='president'||assignment_role==='faculty_coordinator') {
      if(!isAdmin) throw new ApiError(403,'Only an administrator can appoint the President or Faculty Coordinator.');
    }
    const [[user]]=await pool.query('SELECT id,role,is_active FROM users WHERE id=:id',{id:user_id});
    if(!user || !user.is_active) throw new ApiError(400,'That account is not active.');
    if(assignment_role==='faculty_coordinator' && user.role!=='teacher') throw new ApiError(400,'Faculty Coordinator must be a teacher account.');

    if(assignment_role==='president'){
      await pool.query('UPDATE clubs SET president_id=:uid WHERE id=:clubId',{uid:user_id,clubId});
      await pool.query(`DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='president'`,{clubId});
    }
    if(assignment_role==='vice_president'){
      await pool.query('UPDATE clubs SET vp_id=:uid WHERE id=:clubId',{uid:user_id,clubId});
      await pool.query(`DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='vice_president'`,{clubId});
    }
    if(assignment_role==='faculty_coordinator'){
      await pool.query('UPDATE clubs SET faculty_coordinator_id=:uid WHERE id=:clubId',{uid:user_id,clubId});
      await pool.query(`DELETE FROM club_assignments WHERE club_id=:clubId AND assignment_role='faculty_coordinator'`,{clubId});
    }
    await pool.query(`INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:userId,:role,:assignedBy)`,{clubId,user_id: user_id,role:assignment_role,assignedBy:req.user.id});
    await logAction({actorId:req.user.id,action:'club.assignment_added',targetType:'club',targetId:clubId,details:`${assignment_role} -> user ${user_id}`});
    res.status(201).json({message:'Club responsibility assigned.'});
  }catch(err){next(err);}
}

async function removeClubAssignment(req,res,next){
  try{
    const clubId=Number(req.params.id); const assignmentId=Number(req.params.assignmentId);
    const [rows]=await pool.query('SELECT * FROM club_assignments WHERE id=:id AND club_id=:clubId',{id:assignmentId,clubId});
    const assignment=rows[0]; if(!assignment) throw new ApiError(404,'Assignment not found.');
    if(req.user.role!=='admin'){
      const access=(await hasClubAccess(req.user.id,clubId)).map(r=>r.assignment_role);
      if(!access.includes('president')) throw new ApiError(403,'Only the club President can change delegated access.');
      if(['president','faculty_coordinator'].includes(assignment.assignment_role)) throw new ApiError(403,'Only an administrator can remove this responsibility.');
    }
    if(assignment.assignment_role==='vice_president') await pool.query('UPDATE clubs SET vp_id=NULL WHERE id=:clubId AND vp_id=:uid',{clubId,uid:assignment.user_id});
    if(assignment.assignment_role==='faculty_coordinator') await pool.query('UPDATE clubs SET faculty_coordinator_id=NULL WHERE id=:clubId AND faculty_coordinator_id=:uid',{clubId,uid:assignment.user_id});
    await pool.query('DELETE FROM club_assignments WHERE id=:id',{id:assignmentId});
    await logAction({actorId:req.user.id,action:'club.assignment_removed',targetType:'club',targetId:clubId,details:`assignment ${assignmentId} removed`});
    res.json({message:'Club access removed.'});
  }catch(err){next(err);}
}

async function submitClubRequest(req,res,next){
  try{
    const {club_name,category,description,faculty_coordinator,proposed_vp_id,contact_email,supporting_info}=req.body;
    if(!club_name||!category||!description||!contact_email) throw new ApiError(400,'Club name, category, description and contact email are required.');
    const [result]=await pool.query(`INSERT INTO club_requests (club_name,category,description,faculty_coordinator,proposed_president_id,proposed_vp_id,contact_email,supporting_info) VALUES (:club_name,:category,:description,:coordinator,:presidentId,:vpId,:contact_email,:supporting_info)`,{club_name,category,description,coordinator:faculty_coordinator||'To be appointed by admin',presidentId:req.user.id,vpId:proposed_vp_id||null,contact_email,supporting_info:supporting_info||null});
    await notify({target:{scope:'role',role:'admin'},type:'club_request',title:'New club registration submitted',body:`${club_name} is awaiting review.`,urgency:'normal',referenceType:'club_request',referenceId:result.insertId}).catch(()=>{});
    res.status(201).json({message:'Your request has been submitted for review.',requestId:result.insertId});
  }catch(err){next(err);}
}
async function myClubRequests(req,res,next){try{const [rows]=await pool.query('SELECT * FROM club_requests WHERE proposed_president_id=:uid ORDER BY created_at DESC',{uid:req.user.id});res.json({requests:rows});}catch(err){next(err);}}
async function listClubRequests(req,res,next){try{const status=req.query.status||'pending';const [rows]=await pool.query(`SELECT cr.*,u.full_name AS proposed_president_name,u.email AS proposed_president_email FROM club_requests cr JOIN users u ON u.id=cr.proposed_president_id WHERE cr.status=:status ORDER BY cr.created_at DESC`,{status});res.json({requests:rows});}catch(err){next(err);}}

async function reviewClubRequest(req,res,next){
  const conn=await pool.getConnection();
  try{
    const {decision,note,faculty_coordinator_id}=req.body;
    if(!['approved','rejected'].includes(decision)) throw new ApiError(400,'Decision must be approved or rejected.');
    await conn.beginTransaction();
    const [rows]=await conn.query('SELECT * FROM club_requests WHERE id=:id FOR UPDATE',{id:req.params.id}); const request=rows[0];
    if(!request) throw new ApiError(404,'Request not found.');
    if(!['pending','under_review'].includes(request.status)) throw new ApiError(409,'This request has already been reviewed.');
    let coordinatorId=faculty_coordinator_id||null;
    if(decision==='approved' && coordinatorId){const [t]=await conn.query("SELECT id FROM users WHERE id=:id AND role='teacher' AND is_active=TRUE",{id:coordinatorId});if(!t[0]) throw new ApiError(400,'Faculty Coordinator must be an active teacher account.');}
    await conn.query('UPDATE club_requests SET status=:decision,reviewed_by=:reviewerId,review_note=:note,reviewed_at=NOW() WHERE id=:id',{decision,reviewerId:req.user.id,note:note||null,id:req.params.id});
    if(decision==='approved'){
      const [clubResult]=await conn.query(`INSERT INTO clubs (request_id,name,category,description,faculty_coordinator,president_id,vp_id,contact_email,faculty_coordinator_id) VALUES (:requestId,:name,:category,:description,:legacyCoordinator,:presidentId,:vpId,:contactEmail,:coordinatorId)`,{requestId:request.id,name:request.club_name,category:request.category,description:request.description,legacyCoordinator:request.faculty_coordinator,presidentId:request.proposed_president_id,vpId:request.proposed_vp_id,contactEmail:request.contact_email,coordinatorId:coordinatorId});
      await conn.query(`INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'president',:adminId)`,{clubId:clubResult.insertId,uid:request.proposed_president_id,adminId:req.user.id});
      if(request.proposed_vp_id) await conn.query(`INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'vice_president',:adminId)`,{clubId:clubResult.insertId,uid:request.proposed_vp_id,adminId:req.user.id});
      if(coordinatorId) await conn.query(`INSERT INTO club_assignments (club_id,user_id,assignment_role,assigned_by) VALUES (:clubId,:uid,'faculty_coordinator',:adminId)`,{clubId:clubResult.insertId,uid:coordinatorId,adminId:req.user.id});
    }
    await conn.commit();
    await logAction({actorId:req.user.id,action:`club_request.${decision}`,targetType:'club_request',targetId:request.id,details:`${request.club_name} — ${decision}`});
    const body=decision==='approved'?`Your request for ${request.club_name} was approved.`:`Your request for ${request.club_name} was not approved.${note?` Reason: ${note}`:''}`;
    await notifyUser(request.proposed_president_id,{type:'club_decision',title:`${request.club_name}: ${decision}`,body,urgency:'important',referenceType:'club_request',referenceId:request.id}).catch(()=>{});
    if(request.proposed_vp_id) await notifyUser(request.proposed_vp_id,{type:'club_decision',title:`${request.club_name}: ${decision}`,body,urgency:'important',referenceType:'club_request',referenceId:request.id}).catch(()=>{});
    if(decision==='approved') await notify({target:{scope:'campus'},type:'club_decision',title:`New club: ${request.club_name}`,body:`${request.club_name} is now an official club.`,referenceType:'club_request',referenceId:request.id}).catch(()=>{});
    res.json({message:`Request ${decision}.`});
  }catch(err){await conn.rollback();next(err);}finally{conn.release();}
}

module.exports={listClubs,getClub,joinClub,leaveClub,myClub,myMemberships,updateClub,submitClubRequest,myClubRequests,listClubRequests,reviewClubRequest,listAssignments,assignClubMember,removeClubAssignment,listAssignmentCandidates};
