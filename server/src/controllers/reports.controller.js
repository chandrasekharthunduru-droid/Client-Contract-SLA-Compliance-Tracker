const pool = require('../config/db');

/** GET /api/reports/summary */
const getReportSummary = async (req, res, next) => {
  try {
    const { date_from, date_to, customer_id, status, priority } = req.query;
    const conditions = [];
    const params = [];

    if (date_from) { params.push(date_from); conditions.push(`con.start_date >= $${params.length}`); }
    if (date_to) { params.push(date_to); conditions.push(`con.end_date <= $${params.length}`); }
    if (customer_id) { params.push(customer_id); conditions.push(`con.customer_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`con.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`con.priority = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [contractReport, slaReport, incidentReport, renewalForecast, customerReport] = await Promise.all([
      // Contract status report
      pool.query(`
        SELECT con.*, cu.company_name, cu.name as customer_name
        FROM contracts con
        JOIN customers cu ON con.customer_id = cu.id
        ${where}
        ORDER BY con.created_at DESC
        LIMIT 100
      `, params),
      // SLA compliance report
      pool.query(`
        SELECT s.*, con.title as contract_title, con.contract_number, cu.company_name
        FROM sla_commitments s
        JOIN contracts con ON s.contract_id = con.id
        JOIN customers cu ON con.customer_id = cu.id
        ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
        ORDER BY s.compliance_pct ASC
        LIMIT 100
      `, params),
      // Breach incidents report
      pool.query(`
        SELECT bi.*, con.title as contract_title, cu.company_name
        FROM breach_incidents bi
        JOIN contracts con ON bi.contract_id = con.id
        JOIN customers cu ON con.customer_id = cu.id
        ${where}
        ORDER BY bi.incident_date DESC
        LIMIT 100
      `, params),
      // Renewal forecast (next 90 days)
      pool.query(`
        SELECT con.id, con.contract_number, con.title, con.renewal_date, con.value, con.priority, con.status,
          cu.company_name, (con.renewal_date - CURRENT_DATE) as days_left
        FROM contracts con
        JOIN customers cu ON con.customer_id = cu.id
        WHERE con.renewal_date IS NOT NULL AND con.renewal_date >= CURRENT_DATE
          AND con.renewal_date <= CURRENT_DATE + INTERVAL '90 days'
          ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
        ORDER BY con.renewal_date ASC
      `, params),
      // Customer contract summary
      pool.query(`
        SELECT cu.id, cu.name, cu.company_name, cu.industry,
          COUNT(con.id) as contract_count,
          COALESCE(SUM(con.value), 0) as total_value,
          COUNT(con.id) FILTER (WHERE con.status = 'active') as active_contracts,
          MAX(con.end_date) as latest_contract_end
        FROM customers cu
        LEFT JOIN contracts con ON cu.id = con.customer_id
        ${where}
        GROUP BY cu.id, cu.name, cu.company_name, cu.industry
        ORDER BY total_value DESC
        LIMIT 50
      `, params),
    ]);

    // Summary stats
    const summaryStats = await pool.query(`
      SELECT
        COUNT(*) as total_contracts,
        COALESCE(SUM(value), 0) as total_value,
        ROUND(AVG(value), 2) as avg_value,
        COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_contracts
      FROM contracts con ${where}
    `, params);

    res.json({
      success: true,
      data: {
        summary: summaryStats.rows[0],
        contracts: contractReport.rows,
        sla: slaReport.rows,
        incidents: incidentReport.rows,
        renewalForecast: renewalForecast.rows,
        customerSummary: customerReport.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getReportSummary };
