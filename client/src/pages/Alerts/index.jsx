import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Clock, Shield, FileX, RefreshCw, ChevronDown } from 'lucide-react';
import { alertsAPI } from '../../api';
import { formatRelativeDate, capitalize } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ALERT_ICONS = {
  renewal_warning: { icon: Clock, color: 'text-amber-500 bg-amber-50' },
  renewal_critical: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
  contract_expired: { icon: FileX, color: 'text-red-600 bg-red-50' },
  sla_breach: { icon: Shield, color: 'text-orange-500 bg-orange-50' },
  sla_at_risk: { icon: Shield, color: 'text-yellow-500 bg-yellow-50' },
  incident_created: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
  general: { icon: Bell, color: 'text-blue-500 bg-blue-50' },
};

const SEVERITY_COLORS = {
  low: 'border-l-green-400', medium: 'border-l-yellow-400',
  high: 'border-l-orange-500', critical: 'border-l-red-600',
};

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false);
  const [readDropdownOpen, setReadDropdownOpen] = useState(false);

  // Derive severity and read filters directly from search parameters
  const severityFilter = searchParams.get('severity') || '';
  const readFilter = searchParams.get('read') || '';

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (severityFilter) params.severity = severityFilter;
      if (readFilter !== '') params.is_read = readFilter;
      if (isRefresh) params.refresh = 'true';
      const { data } = await alertsAPI.getAll({ ...params, limit: 100 });
      setAlerts(data.data);
      setUnreadCount(data.unread_count);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [severityFilter, readFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const setSeverityFilter = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set('severity', val);
      else next.delete('severity');
      return next;
    });
  };

  const setReadFilter = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set('read', val);
      else next.delete('read');
      return next;
    });
  };

  const handleMarkRead = async (id) => {
    try {
      await alertsAPI.markRead(id);
      setAlerts(a => a.map(al => al.id === id ? { ...al, is_read: true } : al));
      setUnreadCount(n => Math.max(0, n - 1));
      window.dispatchEvent(new Event('alerts-updated'));
    } catch {
      // Ignore mark-read failures
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsAPI.markAllRead();
      setAlerts(a => a.map(al => ({ ...al, is_read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
      window.dispatchEvent(new Event('alerts-updated'));
    } catch { toast.error('Failed to mark all as read'); }
  };

  const handleDismiss = async (id) => {
    try {
      await alertsAPI.dismiss(id);
      toast.success('Alert dismissed');
      window.dispatchEvent(new Event('alerts-updated'));
      fetchAlerts(false);
    } catch { toast.error('Failed to dismiss'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Alerts & Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} unread</span>
            )}
          </h1>
          <p className="page-subtitle">Auto-computed alerts for renewals, expirations, and SLA risks</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => fetchAlerts(true)} disabled={refreshing} className="btn-secondary">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary gap-2">
              <CheckCheck size={15} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-30 card p-4 mb-4 flex flex-col sm:flex-row gap-3 overflow-visible">
        {/* Custom Severity Dropdown */}
        <div className="relative w-full sm:w-36">
          <button
            onClick={() => {
              setSeverityDropdownOpen(!severityDropdownOpen);
              setReadDropdownOpen(false);
            }}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{severityFilter ? capitalize(severityFilter) : 'All Severity'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${severityDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {severityDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSeverityDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ originY: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                >
                  {['', 'low', 'medium', 'high', 'critical'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => {
                        setSeverityFilter(sev);
                        setSeverityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        severityFilter === sev ? 'text-electric-600 font-medium bg-electric-50/40' : 'text-gray-700'
                      }`}
                    >
                      {sev ? capitalize(sev) : 'All Severity'}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Custom Read Status Dropdown */}
        <div className="relative w-full sm:w-36">
          <button
            onClick={() => {
              setReadDropdownOpen(!readDropdownOpen);
              setSeverityDropdownOpen(false);
            }}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{readFilter === 'false' ? 'Unread' : readFilter === 'true' ? 'Read' : 'All Alerts'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${readDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {readDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setReadDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ originY: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                >
                  {[
                    { value: '', label: 'All Alerts' },
                    { value: 'false', label: 'Unread' },
                    { value: 'true', label: 'Read' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setReadFilter(opt.value);
                        setReadDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        readFilter === opt.value ? 'text-electric-600 font-medium bg-electric-50/40' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Alert List */}
      {loading ? <LoadingSpinner text="Loading alerts..." /> : alerts.length === 0 ? (
        <div className="card">
          <EmptyState icon={Bell} title="No alerts" description="All clear! The alert engine found no issues." />
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const { icon: Icon, color } = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.general;
            return (
              <div key={alert.id}
                className={`card p-4 border-l-4 ${SEVERITY_COLORS[alert.severity] || 'border-l-gray-200'} ${!alert.is_read ? 'bg-blue-50/30' : ''} transition-all duration-200 hover:shadow-card-hover`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{alert.title}</span>
                      {!alert.is_read && (
                        <span className="w-2 h-2 bg-electric-500 rounded-full flex-shrink-0" />
                      )}
                      {alert.severity === 'critical' ? (
                        <motion.span
                          animate={{
                            boxShadow: [
                              "0 0 0 0px rgba(239, 68, 68, 0)",
                              "0 0 8px 1.5px rgba(239, 68, 68, 0.35)",
                              "0 0 0 0px rgba(239, 68, 68, 0)"
                            ]
                          }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          className="badge badge-critical inline-flex items-center"
                        >
                          <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                          </span>
                          {alert.severity}
                        </motion.span>
                      ) : alert.severity === 'high' ? (
                        <motion.span
                          animate={{
                            boxShadow: [
                              "0 0 0 0px rgba(249, 115, 22, 0)",
                              "0 0 8px 1.5px rgba(249, 115, 22, 0.35)",
                              "0 0 0 0px rgba(249, 115, 22, 0)"
                            ]
                          }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          className="badge badge-high inline-flex items-center"
                        >
                          <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 [animation-duration:2.5s]"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                          </span>
                          {alert.severity}
                        </motion.span>
                      ) : (
                        <span className={`badge ${alert.severity === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                          {alert.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {alert.company_name && <span>{alert.company_name}</span>}
                      {alert.contract_number && (
                        <Link to={`/contracts/${alert.contract_id}`} className="text-electric-500 hover:underline">
                          {alert.contract_number}
                        </Link>
                      )}
                      <span>{formatRelativeDate(alert.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!alert.is_read && (
                      <button onClick={() => handleMarkRead(alert.id)}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-electric-600 rounded-lg" title="Mark as read">
                        <CheckCheck size={15} />
                      </button>
                    )}
                    <button onClick={() => handleDismiss(alert.id)}
                      className="btn-ghost p-1.5 text-gray-400 hover:text-red-500 rounded-lg" title="Dismiss">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
