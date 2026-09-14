const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

const VALID_FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox', 'number', 'email'];

async function assertOwnsClub(userId, role, clubId) {
  if (role === 'admin') return;
  const [rows] = await pool.query(
    'SELECT id FROM clubs WHERE id = :clubId AND (president_id = :userId OR vp_id = :userId)',
    { clubId, userId }
  );
  if (rows.length === 0) throw new ApiError(403, 'You can only manage your own club.');
}

// ---------- Public / student-facing ----------

async function listFormsForClub(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.title, f.description, f.is_open, f.created_at,
              (SELECT COUNT(*) FROM club_form_responses r WHERE r.form_id = f.id) AS response_count
       FROM club_forms f WHERE f.club_id = :clubId ORDER BY f.created_at DESC`,
      { clubId: req.params.clubId }
    );
    res.json({ forms: rows });
  } catch (err) { next(err); }
}

async function getForm(req, res, next) {
  try {
    const [formRows] = await pool.query(
      `SELECT f.*, c.name AS club_name FROM club_forms f JOIN clubs c ON c.id = f.club_id WHERE f.id = :id`,
      { id: req.params.id }
    );
    if (!formRows[0]) throw new ApiError(404, 'Form not found.');

    const [fields] = await pool.query(
      'SELECT id, label, field_type, options, is_required, position FROM club_form_fields WHERE form_id = :id ORDER BY position',
      { id: req.params.id }
    );

    let alreadySubmitted = false;
    if (req.user) {
      const [existing] = await pool.query(
        'SELECT id FROM club_form_responses WHERE form_id = :id AND user_id = :uid',
        { id: req.params.id, uid: req.user.id }
      );
      alreadySubmitted = existing.length > 0;
    }

    res.json({
      form: formRows[0],
      fields: fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : null })),
      alreadySubmitted,
    });
  } catch (err) { next(err); }
}

async function submitResponse(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const formId = req.params.id;
    const { answers } = req.body; // [{ fieldId, value }]
    if (!Array.isArray(answers)) throw new ApiError(400, 'Answers are required.');

    const [formRows] = await conn.query('SELECT * FROM club_forms WHERE id = :id', { id: formId });
    if (!formRows[0]) throw new ApiError(404, 'Form not found.');
    if (!formRows[0].is_open) throw new ApiError(409, 'This form is no longer accepting responses.');

    const [fields] = await conn.query('SELECT id, is_required FROM club_form_fields WHERE form_id = :id', { id: formId });
    const answerByField = new Map(answers.map((a) => [Number(a.fieldId), a.value]));
    for (const field of fields) {
      const value = answerByField.get(field.id);
      if (field.is_required && (value === undefined || value === null || value === '')) {
        throw new ApiError(400, 'Please fill in all required fields.');
      }
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO club_form_responses (form_id, user_id) VALUES (:formId, :userId)',
      { formId, userId: req.user.id }
    );
    for (const [fieldId, value] of answerByField.entries()) {
      await conn.query(
        'INSERT INTO club_form_answers (response_id, field_id, answer_text) VALUES (:responseId, :fieldId, :value)',
        { responseId: result.insertId, fieldId, value: value === undefined || value === null ? '' : String(value) }
      );
    }
    await conn.commit();

    res.status(201).json({ message: 'Response submitted.' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return next(new ApiError(409, "You've already submitted this form."));
    next(err);
  } finally {
    conn.release();
  }
}

// ---------- Club leadership / admin ----------

async function createForm(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { club_id, title, description, fields } = req.body;
    if (!club_id || !title || !Array.isArray(fields) || fields.length === 0) {
      throw new ApiError(400, 'A club, title, and at least one field are required.');
    }
    await assertOwnsClub(req.user.id, req.user.role, club_id);

    for (const f of fields) {
      if (!f.label || !VALID_FIELD_TYPES.includes(f.field_type)) {
        throw new ApiError(400, 'Every field needs a label and a valid type.');
      }
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO club_forms (club_id, created_by, title, description) VALUES (:club_id, :createdBy, :title, :description)',
      { club_id, createdBy: req.user.id, title, description: description || null }
    );

    let position = 0;
    for (const f of fields) {
      await conn.query(
        `INSERT INTO club_form_fields (form_id, label, field_type, options, is_required, position)
         VALUES (:formId, :label, :fieldType, :options, :required, :position)`,
        {
          formId: result.insertId,
          label: f.label,
          fieldType: f.field_type,
          options: f.field_type === 'select' && Array.isArray(f.options) ? JSON.stringify(f.options) : null,
          required: !!f.is_required,
          position: position++,
        }
      );
    }
    await conn.commit();

    res.status(201).json({ message: 'Form created.', formId: result.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function setFormOpen(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT club_id FROM club_forms WHERE id = :id', { id: req.params.id });
    if (!rows[0]) throw new ApiError(404, 'Form not found.');
    await assertOwnsClub(req.user.id, req.user.role, rows[0].club_id);

    await pool.query('UPDATE club_forms SET is_open = :isOpen WHERE id = :id', { isOpen: !!req.body.is_open, id: req.params.id });
    res.json({ message: req.body.is_open ? 'Form reopened.' : 'Form closed.' });
  } catch (err) { next(err); }
}

async function listResponses(req, res, next) {
  try {
    const [formRows] = await pool.query('SELECT club_id, title FROM club_forms WHERE id = :id', { id: req.params.id });
    if (!formRows[0]) throw new ApiError(404, 'Form not found.');
    await assertOwnsClub(req.user.id, req.user.role, formRows[0].club_id);

    const [fields] = await pool.query('SELECT id, label FROM club_form_fields WHERE form_id = :id ORDER BY position', { id: req.params.id });
    const [responses] = await pool.query(
      `SELECT r.id, r.submitted_at, u.full_name, u.email
       FROM club_form_responses r JOIN users u ON u.id = r.user_id
       WHERE r.form_id = :id ORDER BY r.submitted_at DESC`,
      { id: req.params.id }
    );

    const [answers] = await pool.query(
      `SELECT a.response_id, a.field_id, a.answer_text
       FROM club_form_answers a JOIN club_form_responses r ON r.id = a.response_id
       WHERE r.form_id = :id`,
      { id: req.params.id }
    );
    const answersByResponse = new Map();
    for (const a of answers) {
      if (!answersByResponse.has(a.response_id)) answersByResponse.set(a.response_id, {});
      answersByResponse.get(a.response_id)[a.field_id] = a.answer_text;
    }

    res.json({
      formTitle: formRows[0].title,
      fields,
      responses: responses.map((r) => ({ ...r, answers: answersByResponse.get(r.id) || {} })),
    });
  } catch (err) { next(err); }
}

module.exports = { listFormsForClub, getForm, submitResponse, createForm, setFormOpen, listResponses };
