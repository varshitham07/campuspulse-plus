const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { notify } = require('../services/notification.service');
const { classify } = require('../services/ai.service');
const { logAction } = require('../services/audit.service');
const { parsePagination } = require('../utils/pagination');

async function listAnnouncements(req,res,next){
  try{
    const {category}=req.query; const params={}; const where=['a.deleted_at IS NULL'];
    if(category&&category!=='all'){where.push('a.category=:category');params.category=category;}
    if(req.user && req.user.role!=='admin'){
      where.push(`(a.target_scope='campus'
        OR (a.target_scope='department' AND a.target_department=(SELECT department FROM users WHERE id=:viewerId))
        OR (a.target_scope='year' AND a.target_year=(SELECT year_of_study FROM users WHERE id=:viewerId))
        OR (a.target_scope='class' AND a.target_class_id IN (SELECT c.id FROM classes c JOIN users u ON u.class_section=c.name WHERE u.id=:viewerId))
        OR (a.target_scope='club' AND a.target_club_id IN (SELECT club_id FROM club_members WHERE user_id=:viewerId UNION SELECT club_id FROM club_assignments WHERE user_id=:viewerId))
        OR (a.target_scope='event' AND a.target_event_id IN (SELECT event_id FROM event_registrations WHERE user_id=:viewerId AND status='registered'))
        OR (a.target_scope='topic' AND a.target_topic_id IN (SELECT topic_id FROM user_topic_subscriptions WHERE user_id=:viewerId)))`);
      params.viewerId=req.user.id;
    } else if(!req.user){ where.push("a.target_scope='campus'"); }
    const {page,pageSize,offset}=parsePagination(req.query);
    const [rows]=await pool.query(`SELECT a.id,a.author_id,a.club_id,a.title,a.body,a.category,a.urgency,a.target_scope,a.instructions,a.created_at,u.full_name AS author_name,u.role AS author_role,c.name AS club_name,t.name AS target_topic_name,cl.name AS target_class_name,sl.id AS safe_location_id,sl.name AS safe_location_name FROM announcements a JOIN users u ON u.id=a.author_id LEFT JOIN clubs c ON c.id=a.club_id LEFT JOIN topics t ON t.id=a.target_topic_id LEFT JOIN classes cl ON cl.id=a.target_class_id LEFT JOIN locations sl ON sl.id=a.safe_location_id WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,params);
    const [[{total}]]=await pool.query(`SELECT COUNT(*) AS total FROM announcements a WHERE ${where.join(' AND ')}`,params);
    res.json({announcements:rows,page,pageSize,total,hasMore:offset+rows.length<total});
  }catch(err){next(err);}
}

async function suggestClassification(req,res,next){try{const {title,body}=req.body;if(!title&&!body)throw new ApiError(400,'Provide some text to classify.');res.json({suggestion:await classify(`${title||''}. ${body||''}`)});}catch(err){next(err);}}

async function resolveLeaderClub(userId,requestedClubId){
  const [rows]=await pool.query(`SELECT c.id,c.name FROM clubs c JOIN club_assignments ca ON ca.club_id=c.id WHERE ca.user_id=:userId AND ca.assignment_role IN ('president','vice_president','faculty_coordinator','member_manager') AND c.is_active=TRUE ${requestedClubId? 'AND c.id=:clubId':''} LIMIT 1`,{userId,clubId:requestedClubId});
  return rows[0];
}
async function createAnnouncement(req,res,next){
  try{
    const {title,body,category,urgency='normal',target_scope,target_department,target_year,target_class_id,target_club_id,target_event_id,target_topic_id,club_id,safe_location_id,instructions}=req.body;
    if(!title||!body||!category||!target_scope) throw new ApiError(400,'Title, message, category and audience are required.');
    let finalClubId=club_id||null;
    const leader = req.user.role === 'admin' ? null : await resolveLeaderClub(req.user.id,target_club_id||club_id);
    const hasClubResponsibility = !!leader;
    if(req.user.role==='teacher'){
      if(!hasClubResponsibility && !['department','class'].includes(target_scope)) throw new ApiError(403,'Teachers may message only their own department or assigned class.');
      if(hasClubResponsibility && !['department','class','club','event','campus'].includes(target_scope)) throw new ApiError(403,'Choose a department, class, your club, event participants, or a genuine college-wide message.');
      if(target_scope==='department'){const [meRows]=await pool.query('SELECT department FROM users WHERE id=:id',{id:req.user.id});if(!meRows[0]?.department || target_department!==meRows[0].department) throw new ApiError(403,'You can only message your own department.');}
      if(target_scope==='class'){
        const [owned]=await pool.query('SELECT id FROM class_teachers WHERE teacher_id=:teacherId AND class_id=:classId',{teacherId:req.user.id,classId:target_class_id});
        if(!owned.length) throw new ApiError(403,'You can only message your assigned class.');
      }
      if(hasClubResponsibility && ['club','event','campus'].includes(target_scope)) finalClubId=leader.id;
    } else if(req.user.role!=='admin') {
      if(!leader) throw new ApiError(403,'You can only send announcements for your own club.');
      finalClubId=leader.id;
      if(!['club','event','campus'].includes(target_scope)) throw new ApiError(403,'Club leaders can message their club, event participants, or the whole college.');
      if(target_scope==='club' && Number(target_club_id||club_id)!==leader.id) throw new ApiError(403,'That is not your club.');
    }
    if(target_scope==='department'&&!target_department) throw new ApiError(400,'Choose a department.');
    if(target_scope==='class'&&!target_class_id) throw new ApiError(400,'Choose a class/section.');
    if(target_scope==='club'&&!target_club_id) throw new ApiError(400,'Choose the club audience.');
    if(target_scope==='event'&&!target_event_id) throw new ApiError(400,'Choose the event audience.');
    if(target_scope==='topic'&&!target_topic_id) throw new ApiError(400,'Choose a topic.');
    if(target_scope==='year'&&!target_year) throw new ApiError(400,'Choose a year.');

    const aiSuggestion=await classify(`${title}. ${body}`).catch(()=>null);
    const [result]=await pool.query(`INSERT INTO announcements (author_id,club_id,title,body,category,urgency,target_scope,target_department,target_year,target_class_id,target_club_id,target_event_id,target_topic_id,safe_location_id,instructions,ai_suggested_category,ai_suggested_urgency) VALUES (:authorId,:clubId,:title,:body,:category,:urgency,:targetScope,:targetDepartment,:targetYear,:targetClassId,:targetClubId,:targetEventId,:targetTopicId,:safeLocationId,:instructions,:aiCategory,:aiUrgency)`,{authorId:req.user.id,clubId:finalClubId,title,body,category,urgency,targetScope:target_scope,targetDepartment:target_department||null,targetYear:target_year||null,targetClassId:target_class_id||null,targetClubId:target_club_id||finalClubId,targetEventId:target_event_id||null,targetTopicId:target_topic_id||null,safeLocationId:safe_location_id||null,instructions:instructions||null,aiCategory:aiSuggestion?.category||null,aiUrgency:aiSuggestion?.urgency||null});
    let safeLocationName=null;if(safe_location_id){const [[sl]]=await pool.query('SELECT name FROM locations WHERE id=:id',{id:safe_location_id});safeLocationName=sl?.name||null;}
    const target={scope:target_scope,department:target_department,year:target_year, classId:target_class_id,clubId:target_club_id||finalClubId,eventId:target_event_id,topicId:target_topic_id};
    const {delivered}=await notify({target,type:'announcement',title,body,urgency,referenceType:'announcement',referenceId:result.insertId,actionLocationId:safe_location_id||null,actionLabel:safe_location_id?`Get directions to ${safeLocationName||'location'}`:null});
    await logAction({actorId:req.user.id,action:'announcement.created',targetType:'announcement',targetId:result.insertId,details:`scope=${target_scope}; recipients=${delivered}`});
    res.status(201).json({message:'Announcement sent.',announcementId:result.insertId,delivered});
  }catch(err){next(err);}
}

async function deleteAnnouncement(req,res,next){
  try{
    const id=Number(req.params.id); const [rows]=await pool.query('SELECT id,author_id,title FROM announcements WHERE id=:id AND deleted_at IS NULL',{id});const a=rows[0];if(!a)throw new ApiError(404,'Announcement not found.');
    if(req.user.role!=='admin'&&Number(a.author_id)!==Number(req.user.id)) throw new ApiError(403,'Only the sender or an administrator can delete this announcement.');
    await pool.query('UPDATE announcements SET deleted_at=NOW(),deleted_by=:deletedBy WHERE id=:id',{deletedBy:req.user.id,id});
    await pool.query("DELETE FROM notifications WHERE reference_type='announcement' AND reference_id=:id",{id});
    await logAction({actorId:req.user.id,action:'announcement.deleted',targetType:'announcement',targetId:id,details:a.title});
    res.json({message:'Announcement removed for everyone.'});
  }catch(err){next(err);}
}
module.exports={listAnnouncements,suggestClassification,createAnnouncement,deleteAnnouncement};
