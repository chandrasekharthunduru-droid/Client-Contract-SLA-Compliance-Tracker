const pool = require('../config/db');

const generateCustomerNumber = () => {
  return 'CUS-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
};

/**
 * GET /api/customers
 */
const getCustomers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.company_name ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM contracts WHERE customer_id = c.id) as contract_count,
        u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
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
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Fetch contracts for this customer
    const contracts = await pool.query(
      `SELECT id, contract_number, title, status, value, start_date, end_date, priority
       FROM contracts WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: { ...result.rows[0], contracts: contracts.rows },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/customers
 */
const createCustomer = async (req, res, next) => {
  try {
    const { name, company_name, email, phone, address, industry, country, status, notes } = req.body;

    if (!name || !company_name) {
      return res.status(400).json({ success: false, message: 'Name and company name are required.' });
    }

    const customer_number = generateCustomerNumber();

    const result = await pool.query(
      `INSERT INTO customers (customer_number, name, company_name, email, phone, address, industry, country, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [customer_number, name, company_name, email, phone, address, industry, country || 'India', status || 'active', notes, req.user.id]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action, changes)
       VALUES ($1, 'customer', $2, $3, 'created', $4)`,
      [req.user.id, result.rows[0].id, name, JSON.stringify(req.body)]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Customer created successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res, next) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Staff cannot edit customers.' });
    }

    const { id } = req.params;
    const { name, company_name, email, phone, address, industry, country, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE customers SET name=$1, company_name=$2, email=$3, phone=$4, address=$5, industry=$6, country=$7, status=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [name, company_name, email, phone, address, industry, country, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action, changes)
       VALUES ($1, 'customer', $2, $3, 'updated', $4)`,
      [req.user.id, id, name, JSON.stringify(req.body)]
    );

    res.json({ success: true, data: result.rows[0], message: 'Customer updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/customers/:id (Admin only)
 */
const deleteCustomer = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete customers.' });
    }

    const { id } = req.params;

    const contractCheck = await pool.query('SELECT COUNT(*) FROM contracts WHERE customer_id = $1', [id]);
    if (parseInt(contractCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing contracts. Archive or reassign contracts first.',
      });
    }

    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'customer', $2, $3, 'deleted')`,
      [req.user.id, id, result.rows[0].name]
    );

    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
