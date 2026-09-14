const pool = require('../config/db');
const { emitToRoom } = require('./socket.service');

async function resolveAudience(target) {
  const { scope, department, year, clubId, eventId, topicId, classId, role } = target;
  if (scope === 'campus') {
    const [rows] = await pool.query("SELECT id FROM users WHERE is_active=TRUE AND approval_status='approved'");
    return rows.map(r=>r.id);
  }
  if (scope === 'role') {
    const [rows] = await pool.query("SELECT id FROM users WHERE role=:role AND is_active=TRUE AND approval_status='approved'",{role}); return rows.map(r=>r.id);
  }
  if (scope === 'department') {
    const [rows] = await pool.query("SELECT id FROM users WHERE department=:department AND is_active=TRUE AND approval_status='approved'",{department}); return rows.map(r=>r.id);
  }
  if (scope === 'year') {
    const [rows] = await pool.query("SELECT id FROM users WHERE year_of_study=:year AND is_active=TRUE AND approval_status='approved'",{year}); return rows.map(r=>r.id);
  }
  if (scope === 'class') {
    const [rows] = await pool.query("SELECT id FROM users WHERE class_section=(SELECT name FROM classes WHERE id=:classId) AND is_active=TRUE AND approval_status='approved'",{classId}); return rows.map(r=>r.id);
  }
  if (scope === 'topic') {
    const [rows] = await pool.query(`SELECT u.id FROM user_topic_subscriptions s JOIN users u ON u.id=s.user_id WHERE s.topic_id=:topicId AND u.is_active=TRUE AND u.approval_status='approved'`,{topicId}); return rows.map(r=>r.id);
  }
  if (scope === 'club') {
    const [rows] = await pool.query(`SELECT user_id AS id FROM club_members WHERE club_id=:clubId
      UNION SELECT user_id AS id FROM club_assignments WHERE club_id=:clubId AND assignment_role IN ('president','vice_president','faculty_coordinator','member_manager')`,{clubId}); return rows.map(r=>r.id);
  }
  if (scope === 'event') {
    const [rows] = await pool.query("SELECT user_id AS id FROM event_registrations WHERE event_id=:eventId AND status='registered'",{eventId}); return rows.map(r=>r.id);
  }
  return [];
}
function socketRoomFor(target){
  const {scope,department,year,clubId,eventId,topicId,classId,role}=target;
  if(scope==='campus') return 'campus'; if(scope==='role') return `role:${role}`; if(scope==='department') return `dept:${department}`;
  if(scope==='year') return `year:${year}`; if(scope==='class') return `class:${classId}`; if(scope==='topic') return `topic:${topicId}`;
  if(scope==='club') return `club:${clubId}`; if(scope==='event') return `event:${eventId}`; return null;
}
async function notify({target,type,title,body,urgency='normal',referenceType=null,referenceId=null,actionLocationId=null,actionLabel=null}){
  const userIds=await resolveAudience(target); if(!userIds.length) return {delivered:0};
  const values=userIds.map(uid=>[uid,type,title,body,urgency,referenceType,referenceId,actionLocationId,actionLabel]);
  await pool.query('INSERT INTO notifications (user_id,type,title,body,urgency,reference_type,reference_id,action_location_id,action_label) VALUES ?',[values]);
  const room=socketRoomFor(target); if(room) emitToRoom(room,'notification:new',{type,title,body,urgency,referenceType,referenceId,actionLocationId,actionLabel,createdAt:new Date()});
  return {delivered:userIds.length};
}
async function notifyUser(userId,opts){
  await pool.query(`INSERT INTO notifications (user_id,type,title,body,urgency,reference_type,reference_id,action_location_id,action_label) VALUES (:userId,:type,:title,:body,:urgency,:referenceType,:referenceId,:actionLocationId,:actionLabel)`,{userId,...opts});
  emitToRoom(`user:${userId}`,'notification:new',{...opts,createdAt:new Date()});
}
module.exports={notify,notifyUser};
