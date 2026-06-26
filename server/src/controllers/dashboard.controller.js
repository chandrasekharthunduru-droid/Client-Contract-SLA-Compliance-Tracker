const pool = require('../config/db');
const { runAlertEngine } = require('./alerts.controller');

/** GET /api/dashboard/summary */
const getDashboardSummary = async (req, res, next) => {
  try {
    // Run alert engine asynchronously in background (fire-and-forget) to not block dashboard load
    runAlertEngine().catch(err => console.error("Error in background alert engine:", err));

    const [
      contractStats, customerStats, slaStats, incidentStats,
      contractsByStatus, contractsByPriority, monthlyTrends,
      slaComplianceTrend, upcomingRenewals, recentActivity, alertSummary
    ] = await Promise.all([
      // Contract KPIs
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'expired') as expired,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE renewal_date IS NOT NULL AND renewal_date > CURRENT_DATE AND renewal_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
          COUNT(*) FILTER (WHERE renewal_date IS NOT NULL AND renewal_date > CURRENT_DATE AND renewal_date <= CURRENT_DATE + INTERVAL '7 days') as expiring_critical,
          COALESCE(SUM(value), 0) as total_value,
          COALESCE(SUM(value) FILTER (WHERE status = 'active'), 0) as active_value
        FROM contracts
      `),
      // Customer KPIs
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM customers`),
      // SLA KPIs
      pool.query(`
        SELECT
          COUNT(*) as total,
          ROUND(AVG(compliance_pct), 1) as avg_compliance,
          COUNT(*) FILTER (WHERE compliance_pct < 90) as at_risk,
          COUNT(*) FILTER (WHERE status = 'breached') as breached
        FROM sla_commitments
      `),
      // Incident KPIs
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE resolution_status IN ('open','in_progress')) as open,
          COUNT(*) FILTER (WHERE severity = 'critical' AND resolution_status != 'closed') as critical_open
        FROM breach_incidents
      `),
      // Contracts by status (pie chart)
      pool.query(`
        SELECT status, COUNT(*) as count FROM contracts GROUP BY status ORDER BY count DESC
      `),
      // Contracts by priority (bar chart)
      pool.query(`
        SELECT priority, COUNT(*) as count FROM contracts GROUP BY priority ORDER BY count DESC
      `),
      // Monthly contract trends (last 12 months)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
          DATE_TRUNC('month', created_at) as month_date,
          COUNT(*) as new_contracts,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COALESCE(SUM(value), 0) as total_value
        FROM contracts
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month_date, month
        ORDER BY month_date ASC
      `),
      // SLA compliance trend (last 6 months average)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
          DATE_TRUNC('month', created_at) as month_date,
          ROUND(AVG(compliance_pct), 1) as avg_compliance
        FROM sla_commitments
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month_date, month
        ORDER BY month_date ASC
      `),
      // Upcoming renewals (next 60 days)
      pool.query(`
        SELECT con.id, con.contract_number, con.title, con.renewal_date, con.value, con.priority,
          cu.company_name, (con.renewal_date - CURRENT_DATE) as days_left
        FROM contracts con
        JOIN customers cu ON con.customer_id = cu.id
        WHERE con.renewal_date IS NOT NULL AND con.renewal_date >= CURRENT_DATE
          AND con.renewal_date <= CURRENT_DATE + INTERVAL '60 days'
          AND con.status = 'active'
        ORDER BY con.renewal_date ASC
        LIMIT 10
      `),
      // Recent activity
      pool.query(`
        SELECT al.*, u.name as user_name FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action != 'viewed'
        ORDER BY al.created_at DESC LIMIT 10
      `),
      // Alert summary
      pool.query(`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical
        FROM alerts WHERE is_dismissed = false
      `),
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          contracts: contractStats.rows[0],
          customers: customerStats.rows[0],
          sla: slaStats.rows[0],
          incidents: incidentStats.rows[0],
          alerts: alertSummary.rows[0],
        },
        charts: {
          contractsByStatus: contractsByStatus.rows,
          contractsByPriority: contractsByPriority.rows,
          monthlyTrends: monthlyTrends.rows,
          slaComplianceTrend: slaComplianceTrend.rows,
        },
        upcomingRenewals: upcomingRenewals.rows,
        recentActivity: recentActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardSummary };
