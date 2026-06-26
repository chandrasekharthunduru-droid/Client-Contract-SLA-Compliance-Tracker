const pool = require('../config/db');

const generateIncidentNumber = () => 'INC-' + Date.now().toString().slice(-6);

/** GET /api/incidents */
const getIncidents = async (req, res, next) => {
  try {
    const { contract_id, severity, resolution_status, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (contract_id) { params.push(contract_id); conditions.push(`bi.contract_id = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`bi.severity = $${params.length}`); }
    if (resolution_status) { params.push(resolution_status); conditions.push(`bi.resolution_status = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countResult = await pool.query(`SELECT COUNT(*) FROM breach_incidents bi ${where}`, params);
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT bi.*, 
        con.title as contract_title, con.contract_number,
        cu.company_name,
        u.name as assigned_to_name
       FROM breach_incidents bi
       JOIN contracts con ON bi.contract_id = con.id
       JOIN customers cu ON con.customer_id = cu.id
       LEFT JOIN users u ON bi.assigned_to = u.id
       ${where}
       ORDER BY bi.incident_date DESC
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

/** GET /api/incidents/:id */
const getIncidentById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT bi.*, con.title as contract_title, con.contract_number, cu.company_name, u.name as assigned_to_name
       FROM breach_incidents bi
       JOIN contracts con ON bi.contract_id = con.id
       JOIN customers cu ON con.customer_id = cu.id
       LEFT JOIN users u ON bi.assigned_to = u.id
       WHERE bi.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Incident not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/** POST /api/incidents */
const createIncident = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ success: false, message: 'Staff cannot create incidents.' });
    const { contract_id, incident_date, incident_type, severity, description, root_cause, assigned_to } = req.body;
    if (!contract_id || !incident_date || !incident_type) {
      return res.status(400).json({ success: false, message: 'Contract, date, and type are required.' });
    }

    const incident_number = generateIncidentNumber();
    const result = await pool.query(
      `INSERT INTO breach_incidents (incident_number, contract_id, incident_date, incident_type, severity, description, root_cause, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [incident_number, contract_id, incident_date, incident_type, severity || 'medium', description, root_cause, assigned_to, req.user.id]
    );

    // Auto-create alert for breach
    await pool.query(
      `INSERT INTO alerts (contract_id, alert_type, severity, title, message)
       VALUES ($1, 'sla_breach', $2, $3, $4)`,
      [contract_id, severity || 'high', `New Breach Incident: ${incident_type}`, `An incident has been logged: ${description || incident_type}`]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'breach_incident', $2, $3, 'created')`,
      [req.user.id, result.rows[0].id, incident_type]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Incident created.' });
  } catch (err) { next(err); }
};

/** PUT /api/incidents/:id */
const updateIncident = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ success: false, message: 'Staff cannot update incidents.' });
    const { id } = req.params;
    const { incident_date, incident_type, severity, description, root_cause, resolution_status, resolved_date, assigned_to, resolution_notes } = req.body;

    const result = await pool.query(
      `UPDATE breach_incidents SET incident_date=$1, incident_type=$2, severity=$3, description=$4,
         root_cause=$5, resolution_status=$6, resolved_date=$7, assigned_to=$8, resolution_notes=$9
       WHERE id=$10 RETURNING *`,
      [incident_date, incident_type, severity, description, root_cause, resolution_status, resolved_date, assigned_to, resolution_notes, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Incident not found.' });

    res.json({ success: true, data: result.rows[0], message: 'Incident updated.' });
  } catch (err) { next(err); }
};

/** PUT /api/incidents/:id/close */
const closeIncident = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ success: false, message: 'Staff cannot close incidents.' });
    const result = await pool.query(
      `UPDATE breach_incidents SET resolution_status='closed', resolved_date=CURRENT_DATE
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Incident not found.' });
    res.json({ success: true, data: result.rows[0], message: 'Incident closed.' });
  } catch (err) { next(err); }
};

module.exports = { getIncidents, getIncidentById, createIncident, updateIncident, closeIncident };
