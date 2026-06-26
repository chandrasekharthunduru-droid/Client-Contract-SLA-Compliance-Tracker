import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, BarChart3, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { reportsAPI, customersAPI } from '../../api';
import { formatCurrency, formatDate, capitalize, getStatusBadgeClass, getPriorityBadgeClass, getComplianceColor } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TABS = ['Overview', 'Contracts', 'SLA', 'Incidents', 'Renewals', 'Customers'];
const STATUS_COLORS = { active: '#10b981', draft: '#94a3b8', expired: '#ef4444', renewed: '#3b82f6', archived: '#f59e0b' };

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', customer_id: '', status: '', priority: '' });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data: res } = await reportsAPI.getSummary(params);
      setData(res.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { customersAPI.getAll({ limit: 100 }).then(({ data }) => setCustomers(data.data)).catch(() => {}); }, []);

  const contractsByStatus = data ? Object.entries(
    data.contracts.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([status, count]) => ({ status, count })) : [];

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 30, 60);
    doc.text('BrandSparkX — Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Summary
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 42);
    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: [
        ['Total Contracts', data.summary.total_contracts],
        ['Total Contract Value', formatCurrency(data.summary.total_value)],
        ['Average Value', formatCurrency(data.summary.avg_value)],
        ['Active Contracts', data.summary.active_contracts],
        ['Expired Contracts', data.summary.expired_contracts],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 30, 60] },
    });

    // Contracts table
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Contract', 'Company', 'Value', 'Status', 'Priority', 'End Date']],
      body: (data.contracts || []).slice(0, 30).map(c => [
        c.contract_number, c.company_name, formatCurrency(c.value, true), capitalize(c.status), capitalize(c.priority), formatDate(c.end_date),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`brandsparkx_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report downloaded!');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Comprehensive contract and SLA performance insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReport} disabled={loading} className="btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportPDF} className="btn-primary gap-2">
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="w-full sm:w-auto">
            <label className="block text-xs text-gray-500 mb-1">Date From</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="form-input text-sm w-full sm:w-36" />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs text-gray-500 mb-1">Date To</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="form-input text-sm w-full sm:w-36" />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs text-gray-500 mb-1">Customer</label>
            <select value={filters.customer_id} onChange={e => setFilters(f => ({ ...f, customer_id: e.target.value }))} className="form-select text-sm w-full sm:w-44">
              <option value="">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="form-select text-sm w-full sm:w-32">
              <option value="">All</option>
              {['active', 'draft', 'expired', 'renewed', 'archived'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
          </div>
          <div className="flex items-end w-full sm:w-auto">
            <button onClick={() => setFilters({ date_from: '', date_to: '', customer_id: '', status: '', priority: '' })} className="btn-ghost btn-sm text-red-500 w-full sm:w-auto text-center">Clear</button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          {[
            { label: 'Total Contracts', value: data.summary.total_contracts, icon: FileText, color: 'bg-electric-50 text-electric-600' },
            { label: 'Total Value', value: formatCurrency(data.summary.total_value, true), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Avg Contract Value', value: formatCurrency(data.summary.avg_value, true), icon: BarChart3, color: 'bg-purple-50 text-purple-600' },
            { label: 'Active', value: data.summary.active_contracts, icon: FileText, color: 'bg-green-50 text-green-600' },
            { label: 'Expired', value: data.summary.expired_contracts, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon size={16} />
              </div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 w-full max-w-full overflow-x-auto custom-scroll whitespace-nowrap">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-electric-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-electric-300'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner text="Loading report..." /> : (
        <>
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Contracts by Status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={contractsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                      {contractsByStatus.map(e => <Cell key={e.status} fill={STATUS_COLORS[e.status] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, capitalize(n)]} />
                    <Legend formatter={capitalize} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">SLA Compliance Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { range: '95-100%', count: (data?.sla || []).filter(s => s.compliance_pct >= 95).length },
                    { range: '90-95%', count: (data?.sla || []).filter(s => s.compliance_pct >= 90 && s.compliance_pct < 95).length },
                    { range: '80-90%', count: (data?.sla || []).filter(s => s.compliance_pct >= 80 && s.compliance_pct < 90).length },
                    { range: '<80%', count: (data?.sla || []).filter(s => s.compliance_pct < 80).length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="SLAs" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-5 lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">Renewal Forecast — Next 90 Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={(data?.renewalForecast || []).slice(0, 20)}>
                    <defs>
                      <linearGradient id="renewalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="renewal_date" tickFormatter={d => formatDate(d)} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [formatCurrency(v, true), 'Value']} labelFormatter={d => formatDate(d)} />
                    <Area type="monotone" dataKey="value" name="Contract Value" stroke="#f59e0b" fill="url(#renewalGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'Contracts' && (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Contract</th><th>Company</th><th>Value</th><th>Status</th><th className="hidden sm:table-cell">Priority</th><th className="hidden md:table-cell">Start</th><th className="hidden md:table-cell">End</th></tr></thead>
                  <tbody>
                    {(data?.contracts || []).map(c => (
                      <tr key={c.id}>
                        <td><div className="font-medium text-xs text-gray-900">{c.contract_number}</div><div className="text-xs text-gray-500 max-w-[180px] truncate">{c.title}</div></td>
                        <td className="text-sm">{c.company_name}</td>
                        <td className="font-semibold">{formatCurrency(c.value, true)}</td>
                        <td><span className={`badge ${getStatusBadgeClass(c.status)}`}>{capitalize(c.status)}</span></td>
                        <td className="hidden sm:table-cell"><span className={`badge ${getPriorityBadgeClass(c.priority)}`}>{capitalize(c.priority)}</span></td>
                        <td className="hidden md:table-cell text-sm text-gray-500">{formatDate(c.start_date)}</td>
                        <td className="hidden md:table-cell text-sm text-gray-500">{formatDate(c.end_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'SLA' && (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>SLA</th><th>Contract</th><th className="hidden sm:table-cell">Company</th><th className="hidden md:table-cell">Response</th><th className="hidden md:table-cell">Resolution</th><th>Compliance</th><th>Status</th></tr></thead>
                  <tbody>
                    {(data?.sla || []).map(s => (
                      <tr key={s.id}>
                        <td className="font-medium text-sm">{s.sla_name}</td>
                        <td className="text-xs font-mono">{s.contract_number}</td>
                        <td className="hidden sm:table-cell text-sm">{s.company_name}</td>
                        <td className="hidden md:table-cell text-sm">{s.target_response_time}</td>
                        <td className="hidden md:table-cell text-sm">{s.target_resolution_time}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="compliance-bar w-12">
                              <div className="compliance-fill" style={{ width: `${s.compliance_pct}%`, background: getComplianceColor(parseFloat(s.compliance_pct)) }} />
                            </div>
                            <span className="text-sm font-semibold" style={{ color: getComplianceColor(parseFloat(s.compliance_pct)) }}>{s.compliance_pct}%</span>
                          </div>
                        </td>
                        <td><span className={`badge ${getStatusBadgeClass(s.status)}`}>{capitalize(s.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Incidents' && (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Incident</th><th>Contract</th><th className="hidden sm:table-cell">Date</th><th>Severity</th><th>Status</th><th className="hidden md:table-cell">Resolved</th></tr></thead>
                  <tbody>
                    {(data?.incidents || []).map(inc => (
                      <tr key={inc.id}>
                        <td><div className="font-medium text-sm">{inc.incident_type}</div><div className="text-xs text-gray-400">{inc.incident_number}</div></td>
                        <td className="text-sm">{inc.company_name}</td>
                        <td className="hidden sm:table-cell text-sm">{formatDate(inc.incident_date)}</td>
                        <td><span className={`badge ${inc.severity === 'critical' ? 'badge-critical' : inc.severity === 'high' ? 'badge-high' : inc.severity === 'medium' ? 'badge-medium' : 'badge-low'}`}>{capitalize(inc.severity)}</span></td>
                        <td><span className={`badge ${getStatusBadgeClass(inc.resolution_status)}`}>{capitalize(inc.resolution_status?.replace('_', ' '))}</span></td>
                        <td className="hidden md:table-cell text-sm text-gray-500">{inc.resolved_date ? formatDate(inc.resolved_date) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Renewals' && (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Contract</th><th className="hidden sm:table-cell">Company</th><th className="hidden md:table-cell">Renewal Date</th><th>Days Left</th><th>Value</th><th className="hidden sm:table-cell">Priority</th></tr></thead>
                  <tbody>
                    {(data?.renewalForecast || []).map(c => (
                      <tr key={c.id}>
                        <td><div className="font-mono text-xs text-gray-500">{c.contract_number}</div><div className="text-sm font-medium max-w-[180px] truncate">{c.title}</div></td>
                        <td className="hidden sm:table-cell text-sm">{c.company_name}</td>
                        <td className="hidden md:table-cell text-sm">{formatDate(c.renewal_date)}</td>
                        <td>
                          <span className={`font-bold text-sm ${c.days_left <= 7 ? 'text-red-600' : c.days_left <= 30 ? 'text-amber-600' : 'text-electric-600'}`}>{c.days_left}d</span>
                        </td>
                        <td className="font-semibold">{formatCurrency(c.value, true)}</td>
                        <td className="hidden sm:table-cell"><span className={`badge ${getPriorityBadgeClass(c.priority)}`}>{capitalize(c.priority)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Customers' && (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Company</th><th className="hidden md:table-cell">Industry</th><th className="hidden sm:table-cell">Contracts</th><th className="hidden sm:table-cell">Active</th><th>Total Value</th></tr></thead>
                  <tbody>
                    {(data?.customerSummary || []).map(c => (
                      <tr key={c.id}>
                        <td className="font-medium text-sm">{c.name}</td>
                        <td className="text-sm">{c.company_name}</td>
                        <td className="hidden md:table-cell text-sm text-gray-500">{c.industry || '—'}</td>
                        <td className="hidden sm:table-cell"><span className="badge badge-draft">{c.contract_count}</span></td>
                        <td className="hidden sm:table-cell"><span className="badge badge-active">{c.active_contracts}</span></td>
                        <td className="font-semibold text-emerald-600">{formatCurrency(c.total_value, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
