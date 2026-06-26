const pool = require('../config/db');

/**
 * Alert Engine: Compute and upsert alerts based on contract and SLA state.
 * Called on-demand when dashboard loads.
 */
const runAlertEngine = async () => {
  const now = new Date();

  // 1. Clear old auto-generated alerts asynchronously (non-blocking)
  pool.query(
    `DELETE FROM alerts WHERE alert_type IN ('renewal_warning','renewal_critical','contract_expired','sla_at_risk') AND created_at < NOW() - INTERVAL '1 day'`
  ).catch(err => console.error("Error clearing old alerts:", err));

  // Phase 1: Run bulk status updates and fetch existing/tombstoned alerts in parallel
  const [existingAlertsRes, deletedAlertsRes] = await Promise.all([
    pool.query(`SELECT contract_id, alert_type FROM alerts`),
    pool.query(`
      SELECT DISTINCT al.entity_id as contract_id, al.entity_name as alert_type
      FROM activity_logs al
      LEFT JOIN contracts c ON al.entity_id = c.id
      LEFT JOIN sla_commitments s ON al.entity_id = s.contract_id
      WHERE al.entity_type = 'alert'
        AND al.action = 'deleted'
        AND (
          (al.entity_name IN ('renewal_warning', 'renewal_critical', 'contract_expired') AND al.created_at >= c.updated_at)
          OR
          (al.entity_name = 'sla_at_risk' AND al.created_at >= COALESCE(s.updated_at, c.updated_at))
        )
    `),
    pool.query(`UPDATE contracts SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE`),
    pool.query(`UPDATE sla_commitments SET status = 'at_risk' WHERE compliance_pct < 90 AND status = 'active'`)
  ]);

  const existingAlertsSet = new Set(
    existingAlertsRes.rows.map(r => `${r.contract_id}_${r.alert_type}`)
  );
  const deletedAlertsSet = new Set(
    deletedAlertsRes.rows.map(r => `${r.contract_id}_${r.alert_type}`)
  );

  // Phase 2: Run all selections in parallel
  const [expiringSoon, expired, atRiskSLAs] = await Promise.all([
    pool.query(
      `SELECT id, contract_number, title, renewal_date, customer_id,
         (renewal_date - CURRENT_DATE) as days_left
       FROM contracts
       WHERE status = 'active' AND renewal_date IS NOT NULL
         AND renewal_date > CURRENT_DATE AND renewal_date <= CURRENT_DATE + INTERVAL '30 days'`
    ),
    pool.query(
      `SELECT id, contract_number, title, end_date FROM contracts
       WHERE status = 'expired' AND end_date < CURRENT_DATE`
    ),
    pool.query(
      `SELECT s.id, s.sla_name, s.compliance_pct, s.contract_id, con.title as contract_title
       FROM sla_commitments s
       JOIN contracts con ON s.contract_id = con.id
       WHERE s.compliance_pct < 90 AND s.status = 'at_risk'`
    )
  ]);

  // Phase 3: Loop and collect inserts to execute in parallel
  const promises = [];
  const newlyGeneratedSet = new Set();

  // expiring soon contracts
  for (const contract of expiringSoon.rows) {
    const daysLeft = parseInt(contract.days_left);
    const severity = daysLeft <= 7 ? 'critical' : 'high';
    const alertType = daysLeft <= 7 ? 'renewal_critical' : 'renewal_warning';
    const title = daysLeft <= 7
      ? `⚠️ CRITICAL: Contract Renews in ${daysLeft} Days`
      : `📅 Renewal Reminder: ${daysLeft} Days Left`;

    const key = `${contract.id}_${alertType}`;
    if (!existingAlertsSet.has(key) && !deletedAlertsSet.has(key) && !newlyGeneratedSet.has(key)) {
      newlyGeneratedSet.add(key);
      promises.push(
        pool.query(
          `INSERT INTO alerts (contract_id, alert_type, severity, title, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            contract.id, alertType, severity, title,
            `Contract "${contract.title}" (${contract.contract_number}) renewal date is ${contract.renewal_date}. ${daysLeft} days remaining.`
          ]
        )
      );
    }
  }

  // expired contracts
  for (const contract of expired.rows) {
    const key = `${contract.id}_contract_expired`;
    if (!existingAlertsSet.has(key) && !deletedAlertsSet.has(key) && !newlyGeneratedSet.has(key)) {
      newlyGeneratedSet.add(key);
      promises.push(
        pool.query(
          `INSERT INTO alerts (contract_id, alert_type, severity, title, message)
           VALUES ($1, 'contract_expired', 'critical', $2, $3)`,
          [
            contract.id,
            `Contract Expired: ${contract.title}`,
            `Contract "${contract.title}" (${contract.contract_number}) has expired as of ${contract.end_date}.`
          ]
        )
      );
    }
  }

  // SLA at risk
  for (const sla of atRiskSLAs.rows) {
    const key = `${sla.contract_id}_sla_at_risk`;
    if (!existingAlertsSet.has(key) && !deletedAlertsSet.has(key) && !newlyGeneratedSet.has(key)) {
      newlyGeneratedSet.add(key);
      promises.push(
        pool.query(
          `INSERT INTO alerts (contract_id, alert_type, severity, title, message)
           VALUES ($1, 'sla_at_risk', 'high', $2, $3)`,
          [
            sla.contract_id,
            `SLA Compliance Below 90%: ${sla.sla_name}`,
            `SLA "${sla.sla_name}" for contract "${sla.contract_title}" has compliance at ${sla.compliance_pct}%.`
          ]
        )
      );
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Cap the total alerts in database to 20
  await pool.query(`
    DELETE FROM alerts
    WHERE id NOT IN (
      SELECT id FROM alerts
      ORDER BY created_at DESC
      LIMIT 20
    )
  `).catch(err => console.error("Error capping alerts:", err));

  return {
    expiringSoon: expiringSoon.rows.length,
    expired: expired.rows.length,
    atRiskSLAs: atRiskSLAs.rows.length,
  };
};

/** GET /api/alerts */
const getAlerts = async (req, res, next) => {
  try {
    const { is_read, severity, page = 1, limit = 50, refresh = 'false' } = req.query;

    // Run alert engine only if refresh=true is explicitly passed
    if (refresh === 'true') {
      await runAlertEngine();
    }

    const conditions = ['a.is_dismissed = false'];
    const params = [];

    if (is_read !== undefined) { params.push(is_read === 'true'); conditions.push(`a.is_read = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`a.severity = $${params.length}`); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const offset = (page - 1) * limit;
    const countResult = await pool.query(`SELECT COUNT(*) FROM alerts a ${where}`, params);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT a.*, con.title as contract_title, con.contract_number, cu.company_name
       FROM alerts a
       LEFT JOIN contracts con ON a.contract_id = con.id
       LEFT JOIN customers cu ON con.customer_id = cu.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const unreadCount = await pool.query(
      `SELECT COUNT(*) FROM alerts WHERE is_read = false AND is_dismissed = false`
    );

    res.json({
      success: true,
      data: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

/** PUT /api/alerts/:id/read */
const markAlertRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE alerts SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Alert marked as read.' });
  } catch (err) { next(err); }
};

/** PUT /api/alerts/read-all */
const markAllRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE alerts SET is_read = true WHERE is_dismissed = false');
    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) { next(err); }
};

/** DELETE /api/alerts/:id */
const dismissAlert = async (req, res, next) => {
  try {
    const alertId = req.params.id;
    // 1. Fetch contract_id and alert_type for the alert
    const alertRes = await pool.query('SELECT contract_id, alert_type FROM alerts WHERE id = $1', [alertId]);
    if (alertRes.rows.length === 0) {
      // If the alert is already deleted (e.g. by capping), treat it as a success so the client can resolve cleanly
      return res.json({ success: true, message: 'Alert dismissed.' });
    }
    const { contract_id, alert_type } = alertRes.rows[0];

    // 2. Physically delete from alerts table
    await pool.query('DELETE FROM alerts WHERE id = $1', [alertId]);

    // 3. Log a tombstone to activity_logs to prevent recreation
    await pool.query(
      `INSERT INTO activity_logs (user_id, entity_type, entity_id, entity_name, action)
       VALUES ($1, 'alert', $2, $3, 'deleted')`,
      [req.user.id, contract_id, alert_type]
    );

    res.json({ success: true, message: 'Alert dismissed and deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAlerts, markAlertRead, markAllRead, dismissAlert, runAlertEngine };
