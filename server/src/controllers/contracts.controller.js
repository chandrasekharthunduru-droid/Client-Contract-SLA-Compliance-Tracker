const pool = require('../config/db');

const generateContractNumber = () => {
  const year = new Date().getFullYear();
  return `CON-${year}-${Date.now().toString().slice(-5)}`;
};

/**
 * GET /api/contracts
 */
const getContracts = async (req, res, next) => {
  try {
    const {
      search, status, priority, contract_type, customer_id,
      page = 1, limit = 20, sort = 'created_at', order = 'desc',
      renewal_before, date_from, date_to
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(con.title ILIKE $${params.length} OR con.contract_number ILIKE $${params.length} OR cu.company_name ILIKE $${params.length})`);
    }
    if (status) { params.push(status); conditions.push(`con.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`con.priority = $${params.length}`); }
    if (contract_type) { params.push(contract_type); conditions.push(`con.contract_type = $${params.length}`); }
    if (customer_id) { params.push(customer_id); conditions.push(`con.customer_id = $${params.length}`); }
    if (renewal_before) { params.push(renewal_before); conditions.push(`con.renewal_date <= $${params.length}`); }
    if (date_from) { params.push(date_from); conditions.push(`con.start_date >= $${params.length}`); }
    if (date_to) { params.push(date_to); conditions.push(`con.end_date <= $${params.length}`); }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const validSorts = { created_at: 'con.created_at', renewal_date: 'con.renewal_date', value: 'con.value', priority: 'con.priority', end_date: 'con.end_date' };
    const sortCol = validSorts[sort] || 'con.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contracts con LEFT JOIN customers cu ON con.customer_id = cu.id ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT con.*, 
        cu.name as customer_name, cu.company_name, cu.email as customer_email,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM sla_commitments WHERE contract_id = con.id) as sla_count,
        (SELECT COUNT(*) FROM breach_incidents WHERE contract_id = con.id AND resolution_status != 'closed') as open_incidents,
        (CURRENT_DATE - con.end_date) as days_overdue,
        (con.renewal_date - CURRENT_DATE) as days_to_renewal
       FROM contracts con
       LEFT JOIN customers cu ON con.customer_id = cu.id
       LEFT JOIN users u ON con.created_by = u.id
       ${whereClause}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/contracts/:id
 */
const getContractById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT con.*, 
        cu.name as customer_name, cu.company_name, cu.email as customer_email, cu.phone as customer_phone,
        u.name as created_by_name,
        (CURRENT_DATE - con.end_date) as days_overdue,
        (con.renewal_date - CURRENT_DATE) as days_to_renewal
       FROM contracts con
       LEFT JOIN customers cu ON con.customer_id = cu.id
       LEFT JOIN users u ON con.created_by = u.id
       WHERE con.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const [slas, incidents, logs] = await Promise.all([
      pool.query('SELECT * FROM sla_commitments WHERE contract_id = $1 ORDER BY created_at DESC', [id]),
      pool.query(
        `SELECT bi.*, u.name as assigned_to_name FROM breach_incidents bi
         LEFT JOIN users u ON bi.assigned_to = u.id
         WHERE bi.contract_id = $1 ORDER BY bi.incident_date DESC`,
        [id]
      ),
      pool.query(
        `SELECT al.*, u.name as user_name FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.entity_id = $1 ORDER BY al.created_at DESC LIMIT 20`,
        [id]
      ),
    ]);

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'contract', $2, $3, 'viewed')`,
      [req.user.id, id, result.rows[0].title]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        sla_commitments: slas.rows,
        breach_incidents: incidents.rows,
        activity_logs: logs.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/contracts
 */
const createContract = async (req, res, next) => {
  try {
    const {
      customer_id, title, contract_type, value, start_date, end_date,
      renewal_date, deliverable_timeline, sla_commitment, priority, status, description
    } = req.body;

    if (!customer_id || !title || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Customer, title, start date, and end date are required.' });
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }
    if (renewal_date && new Date(renewal_date) < new Date(start_date)) {
      return res.status(400).json({ success: false, message: 'Renewal date cannot be before start date.' });
    }
    if (value !== undefined && value < 0) {
      return res.status(400).json({ success: false, message: 'Contract value must be positive.' });
    }

    const contract_number = generateContractNumber();

    const result = await pool.query(
      `INSERT INTO contracts (contract_number, customer_id, title, contract_type, value, start_date, end_date,
         renewal_date, deliverable_timeline, sla_commitment, priority, status, description, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
       RETURNING *`,
      [contract_number, customer_id, title, contract_type || 'Service Agreement', value || 0,
       start_date, end_date, renewal_date, deliverable_timeline, sla_commitment,
       priority || 'medium', status || 'draft', description, req.user.id]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action, changes)
       VALUES ($1, 'contract', $2, $3, 'created', $4)`,
      [req.user.id, result.rows[0].id, title, JSON.stringify(req.body)]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Contract created successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/contracts/:id
 */
const updateContract = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Staff cannot edit contracts.' });
    }

    const { id } = req.params;
    const {
      customer_id, title, contract_type, value, start_date, end_date,
      renewal_date, deliverable_timeline, sla_commitment, priority, status, description
    } = req.body;

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }

    const result = await pool.query(
      `UPDATE contracts SET customer_id=$1, title=$2, contract_type=$3, value=$4, start_date=$5, end_date=$6,
         renewal_date=$7, deliverable_timeline=$8, sla_commitment=$9, priority=$10, status=$11, description=$12, updated_by=$13
       WHERE id=$14 RETURNING *`,
      [customer_id, title, contract_type, value, start_date, end_date,
       renewal_date, deliverable_timeline, sla_commitment, priority, status, description, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action, changes)
       VALUES ($1, 'contract', $2, $3, 'updated', $4)`,
      [req.user.id, id, title, JSON.stringify(req.body)]
    );

    res.json({ success: true, data: result.rows[0], message: 'Contract updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/contracts/:id (Admin only)
 */
const deleteContract = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete contracts.' });
    }
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING title', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }
    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'contract', $2, $3, 'deleted')`,
      [req.user.id, id, result.rows[0].title]
    );
    res.json({ success: true, message: 'Contract deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/contracts/:id/archive
 */
const archiveContract = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Staff cannot archive contracts.' });
    }
    const { id } = req.params;

    // Check current status of the contract
    const selectRes = await pool.query('SELECT status, title FROM contracts WHERE id = $1', [id]);
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const currentStatus = selectRes.rows[0].status;
    const contractTitle = selectRes.rows[0].title;

    let newStatus = 'archived';
    let action = 'archived';
    let msg = 'Contract archived successfully.';

    if (currentStatus === 'archived') {
      newStatus = 'active';
      action = 'updated';
      msg = 'Contract restored from archive successfully.';
    }

    const result = await pool.query(
      `UPDATE contracts SET status = $1, updated_by = $2 WHERE id = $3 RETURNING title`,
      [newStatus, req.user.id, id]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'contract', $2, $3, $4)`,
      [req.user.id, id, contractTitle, action]
    );

    res.json({ success: true, message: msg, status: newStatus });
  } catch (err) {
    next(err);
  }
};

module.exports = { getContracts, getContractById, createContract, updateContract, deleteContract, archiveContract };
