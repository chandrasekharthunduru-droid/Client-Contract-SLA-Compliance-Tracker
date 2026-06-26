const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const isPasswordStrong = (pass) => {
  if (!pass || pass.length < 8) return false;
  let score = 0;
  if (/[A-Z]/.test(pass)) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score >= 3;
};

/**
 * GET /api/users
 * Returns list of all users, ordered by creation date (excluding password hashes)
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, avatar_url, is_active, working_on, employee_status, last_login, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users
 * Creates a new user/staff member. Hashes password using bcrypt.
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, working_on, employee_status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password is too weak. Must be at least 8 characters and include a mix of uppercase, lowercase, numbers, and special characters.'
      });
    }

    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, working_on, employee_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, email, role, working_on, employee_status, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        role,
        working_on ? working_on.trim() : null,
        employee_status || 'Active'
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'user', $2, $3, 'created')`,
      [req.user.id, result.rows[0].id, result.rows[0].name]
    );

    res.status(201).json({ success: true, message: 'User created successfully.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Updates details of an existing user. Can optionally update password if provided.
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, working_on, employee_status, is_active } = req.body;

    const userCheck = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase().trim(), id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // Prevent changing your own role or deactivating yourself
    if (req.user.id === id) {
      if (role && role !== req.user.role) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
      }
      if (is_active === false || employee_status === 'Inactive') {
        return res.status(400).json({ success: false, message: 'You cannot deactivate yourself.' });
      }
    }

    let query = '';
    let params = [];

    if (password && password.trim() !== '') {
      if (!isPasswordStrong(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password is too weak. Must be at least 8 characters and include a mix of uppercase, lowercase, numbers, and special characters.'
        });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      query = `
        UPDATE users
        SET name = $1, email = $2, password_hash = $3, role = $4, working_on = $5, employee_status = $6, is_active = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING id, name, email, role, working_on, employee_status, is_active, updated_at
      `;
      params = [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        role,
        working_on ? working_on.trim() : null,
        employee_status,
        is_active !== undefined ? is_active : true,
        id
      ];
    } else {
      query = `
        UPDATE users
        SET name = $1, email = $2, role = $3, working_on = $4, employee_status = $5, is_active = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, email, role, working_on, employee_status, is_active, updated_at
      `;
      params = [
        name.trim(),
        email.toLowerCase().trim(),
        role,
        working_on ? working_on.trim() : null,
        employee_status,
        is_active !== undefined ? is_active : true,
        id
      ];
    }

    const result = await pool.query(query, params);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'user', $2, $3, 'updated')`,
      [req.user.id, id, result.rows[0].name]
    );

    res.json({ success: true, message: 'User updated successfully.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Deletes a user profile (prevent self-deletion)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const userCheck = await pool.query('SELECT name FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userName = userCheck.rows[0].name;

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'user', $2, $3, 'deleted')`,
      [req.user.id, id, userName]
    );

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
