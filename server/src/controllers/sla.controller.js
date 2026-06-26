const pool = require('../config/db');

/** GET /api/sla */
const getSLAs = async (req, res, next) => {
  try {
    const { contract_id, status, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (contract_id) { params.push(contract_id); conditions.push(`s.contract_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM sla_commitments s ${where}`, params);
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT s.*, con.title as contract_title, con.contract_number, cu.company_name
       FROM sla_commitments s
       JOIN contracts con ON s.contract_id = con.id
       JOIN customers cu ON con.customer_id = cu.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

/** GET /api/sla/:id */
const getSLAById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.*, con.title as contract_title, con.contract_number, cu.company_name
       FROM sla_commitments s
       JOIN contracts con ON s.contract_id = con.id
       JOIN customers cu ON con.customer_id = cu.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'SLA not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/** POST /api/sla */
const createSLA = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ success: false, message: 'Staff cannot create SLAs.' });
    const { contract_id, sla_name, target_response_time, target_resolution_time, status, compliance_pct, last_review_date, notes } = req.body;
    if (!contract_id || !sla_name) return res.status(400).json({ success: false, message: 'Contract ID and SLA name are required.' });

    const result = await pool.query(
      `INSERT INTO sla_commitments (contract_id, sla_name, target_response_time, target_resolution_time, status, compliance_pct, last_review_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [contract_id, sla_name, target_response_time, target_resolution_time, status || 'active', compliance_pct || 100, last_review_date, notes]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'sla_commitment', $2, $3, 'created')`,
      [req.user.id, result.rows[0].id, sla_name]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'SLA commitment created.' });
  } catch (err) { next(err); }
};

/** PUT /api/sla/:id */
const updateSLA = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ success: false, message: 'Staff cannot edit SLAs.' });
    const { id } = req.params;
    const { sla_name, target_response_time, target_resolution_time, status, compliance_pct, last_review_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE sla_commitments SET sla_name=$1, target_response_time=$2, target_resolution_time=$3,
         status=$4, compliance_pct=$5, last_review_date=$6, notes=$7
       WHERE id=$8 RETURNING *`,
      [sla_name, target_response_time, target_resolution_time, status, compliance_pct, last_review_date, notes, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'SLA not found.' });

    res.json({ success: true, data: result.rows[0], message: 'SLA updated successfully.' });
  } catch (err) { next(err); }
};

/** DELETE /api/sla/:id */
const deleteSLA = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    const result = await pool.query('DELETE FROM sla_commitments WHERE id = $1 RETURNING sla_name', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'SLA not found.' });
    res.json({ success: true, message: 'SLA deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getSLAs, getSLAById, createSLA, updateSLA, deleteSLA };
