import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, AlertTriangle, Bell,
  TrendingUp, TrendingDown, RefreshCw, ExternalLink, Clock, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardAPI } from '../../api';
import { formatCurrency, formatDate, formatRelativeDate, capitalize } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const STATUS_COLORS = {
  active: '#10b981', draft: '#94a3b8', expired: '#ef4444',
  renewed: '#3b82f6', archived: '#f59e0b',
};
const PRIORITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

const kpiCardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};

const hoverAnimation = {
  y: -4,
  boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.12), 0 6px 16px -4px rgba(0, 0, 0, 0.08)",
  transition: { duration: 0.2, ease: "easeOut" }
};

const chartGroupVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3,
      duration: 0.45,
      ease: "easeOut"
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut"
    }
  }
};

function StatCard({ icon: Icon, label, value, sub, trend, color = 'blue', loading, pulse, onClick }) {
  const colorMap = {
    blue: { bg: 'bg-electric-50', icon: 'text-electric-500', border: 'border-electric-200', glowColor: 'rgba(37, 99, 235, 0.25)', borderClass: 'border-electric-500/30', borderPulseColors: ['rgba(37, 99, 235, 0.2)', 'rgba(37, 99, 235, 0.6)', 'rgba(37, 99, 235, 0.2)'] },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-200', glowColor: 'rgba(16, 185, 129, 0.25)', borderClass: 'border-emerald-500/30', borderPulseColors: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.6)', 'rgba(16, 185, 129, 0.2)'] },
    red: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-200', glowColor: 'rgba(239, 68, 68, 0.25)', borderClass: 'border-red-500/30', borderPulseColors: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.2)'] },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-200', glowColor: 'rgba(245, 158, 11, 0.25)', borderClass: 'border-amber-500/30', borderPulseColors: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.6)', 'rgba(245, 158, 11, 0.2)'] },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200', glowColor: 'rgba(168, 85, 247, 0.25)', borderClass: 'border-purple-500/30', borderPulseColors: ['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.6)', 'rgba(168, 85, 247, 0.2)'] },
  };
  const c = colorMap[color];

  return (
    <motion.div
      variants={kpiCardVariants}
      whileHover={hoverAnimation}
      onClick={onClick}
      className={`relative card no-reveal p-5 border ${c.border} cursor-pointer transition-colors duration-200`}
    >
      {pulse && (
        <motion.div
          className={`absolute inset-0 rounded-[0.75rem] pointer-events-none border ${c.borderClass}`}
          animate={{
            boxShadow: [
              "0 0 0 0px rgba(0, 0, 0, 0)",
              `0 0 12px 2px ${c.glowColor}`,
              "0 0 0 0px rgba(0, 0, 0, 0)"
            ],
            borderColor: c.borderPulseColors
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="skeleton h-7 w-24 mb-1 rounded" />
      ) : (
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      )}
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: <span className="font-medium">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value, true) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: res } = await dashboardAPI.getSummary();
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <motion.div
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={headerVariants} className="page-header no-reveal">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview of contract and SLA compliance</p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="btn-secondary gap-2">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
      >
        <StatCard icon={FileText} label="Total Contracts" value={kpis?.contracts?.total || 0}
          sub={`₹${(parseFloat(kpis?.contracts?.total_value || 0) / 100000).toFixed(1)}L total value`}
          color="blue" loading={loading} pulse={true} onClick={() => navigate('/contracts')} />
        <StatCard icon={CheckCircle} label="Active Contracts" value={kpis?.contracts?.active || 0}
          sub={`${kpis?.contracts?.draft || 0} in draft`} color="green" loading={loading} pulse={true} onClick={() => navigate('/contracts?status=active')} />
        <StatCard icon={Clock} label="Expiring Soon" value={kpis?.contracts?.expiring_soon || 0}
          sub={`${kpis?.contracts?.expiring_critical || 0} critical (≤7d)`} color="amber" loading={loading} pulse={true} onClick={() => navigate('/contracts?filter=expiring')} />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={kpis?.sla?.breached || 0}
          sub={`Avg ${kpis?.sla?.avg_compliance || 0}% compliance`} color="red" loading={loading} pulse={true} onClick={() => navigate('/sla?status=breached')} />
        <StatCard icon={Bell} label="Unread Alerts" value={kpis?.alerts?.unread || 0}
          sub={`${kpis?.alerts?.critical || 0} critical`} color="purple" loading={loading} pulse={true} onClick={() => navigate('/alerts?read=false')} />
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        variants={chartGroupVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5"
      >
        {/* Monthly Trends */}
        <motion.div className="card no-reveal p-5 lg:col-span-2" whileHover={hoverAnimation}>
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Contract Trends</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts?.monthlyTrends || []}>
                <defs>
                  <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="new_contracts" name="New Contracts"
                  stroke="#2563EB" strokeWidth={2} fill="url(#colorContracts)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Contract Status Pie */}
        <motion.div className="card no-reveal p-5" whileHover={hoverAnimation}>
          <h3 className="font-semibold text-gray-900 mb-4">Contract Status</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts?.contractsByStatus || []} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {(charts?.contractsByStatus || []).map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, capitalize(n)]} />
                <Legend formatter={(v) => capitalize(v)} iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div
        variants={chartGroupVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5"
      >
        {/* SLA Compliance Trend */}
        <motion.div className="card no-reveal p-5 lg:col-span-2" whileHover={hoverAnimation}>
          <h3 className="font-semibold text-gray-900 mb-4">SLA Compliance Trend (%)</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts?.slaComplianceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg_compliance" name="Avg Compliance"
                  stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Priority Distribution */}
        <motion.div className="card no-reveal p-5" whileHover={hoverAnimation}>
          <h3 className="font-semibold text-gray-900 mb-4">Contracts by Priority</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts?.contractsByPriority || []} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="priority" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={55} tickFormatter={capitalize} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Contracts" radius={[0, 6, 6, 0]}>
                  {(charts?.contractsByPriority || []).map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </motion.div>

      {/* Bottom Row: Upcoming Renewals + Recent Activity */}
      <motion.div
        variants={chartGroupVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        {/* Upcoming Renewals */}
        <motion.div className="card no-reveal p-5" whileHover={hoverAnimation}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Renewals</h3>
            <Link to="/contracts?sort=renewal_date" className="text-xs text-electric-500 hover:underline flex items-center gap-1">
              View all <ExternalLink size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {(data?.upcomingRenewals || []).slice(0, 6).map((contract) => {
                const days = parseInt(contract.days_left);
                const urgencyColor = days <= 7 ? 'border-l-red-500 bg-red-50' : days <= 30 ? 'border-l-amber-400 bg-amber-50' : 'border-l-electric-400 bg-blue-50';
                return (
                  <Link key={contract.id} to={`/contracts/${contract.id}`}
                    className={`flex items-center justify-between p-3 rounded-xl border-l-4 ${urgencyColor} hover:opacity-90 transition-opacity`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{contract.title}</div>
                      <div className="text-xs text-gray-500">{contract.company_name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-electric-600'}`}>
                        {days}d
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(contract.renewal_date)}</div>
                    </div>
                  </Link>
                );
              })}
              {!data?.upcomingRenewals?.length && (
                <p className="text-sm text-gray-400 text-center py-6">No upcoming renewals in 60 days</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div className="card no-reveal p-5" whileHover={hoverAnimation}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-1">
              {(data?.recentActivity || []).map((log, i) => {
                const actionColors = { created: 'bg-emerald-100 text-emerald-700', updated: 'bg-blue-100 text-blue-700', deleted: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', exported: 'bg-purple-100 text-purple-700' };
                return (
                  <div key={log.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{log.entity_name || '—'}</p>
                      <p className="text-xs text-gray-400">{log.user_name} · {formatRelativeDate(log.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {!data?.recentActivity?.length && (
                <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
