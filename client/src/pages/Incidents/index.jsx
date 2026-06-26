import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { incidentsAPI, contractsAPI } from '../../api';
import { formatDate, capitalize, getSeverityColor } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const INCIDENT_TYPES = ['Service Downtime', 'SLA Breach', 'Deliverable Delay', 'Quality Issue', 'Communication Gap', 'Data Security Breach', 'Payment Dispute', 'Other'];

const severityBorderColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500'
};

const tbodyVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: "easeOut"
    }
  }
};

const ActionButton = ({ onClick, tooltip, icon: Icon, hoverColor }) => {
  return (
    <div className="relative group flex items-center justify-center">
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        className={`btn-ghost p-1.5 text-gray-400 ${hoverColor} rounded-lg flex items-center justify-center cursor-pointer`}
      >
        <Icon size={14} />
      </motion.button>
      <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
        {tooltip}
      </span>
    </div>
  );
};

function IncidentForm({ initial, onSuccess, onCancel }) {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({
    contract_id: initial?.contract_id || '', incident_date: initial?.incident_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    incident_type: initial?.incident_type || '', severity: initial?.severity || 'medium',
    description: initial?.description || '', root_cause: initial?.root_cause || '',
    resolution_status: initial?.resolution_status || 'open', resolved_date: initial?.resolved_date?.split('T')[0] || '',
    resolution_notes: initial?.resolution_notes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { contractsAPI.getAll({ limit: 100 }).then(({ data }) => setContracts(data.data)).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contract_id || !form.incident_type) { toast.error('Contract and incident type are required'); return; }
    setSaving(true);
    try {
      if (initial?.id) await incidentsAPI.update(initial.id, form);
      else await incidentsAPI.create(form);
      onSuccess();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Contract <span className="text-red-400">*</span></label>
          <select value={form.contract_id} onChange={e => setForm(f => ({ ...f, contract_id: e.target.value }))} className="form-select">
            <option value="">Select contract...</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.title.slice(0, 35)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Incident Date</label>
          <input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} className="form-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Incident Type <span className="text-red-400">*</span></label>
          <select value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))} className="form-select">
            <option value="">Select type...</option>
            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Severity</label>
          <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="form-select">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="form-textarea" placeholder="What happened?" />
      </div>
      <div>
        <label className="form-label">Root Cause</label>
        <textarea value={form.root_cause} onChange={e => setForm(f => ({ ...f, root_cause: e.target.value }))} rows={2} className="form-textarea" placeholder="What caused this incident?" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Resolution Status</label>
          <select value={form.resolution_status} onChange={e => setForm(f => ({ ...f, resolution_status: e.target.value }))} className="form-select">
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="form-label">Resolved Date</label>
          <input type="date" value={form.resolved_date} onChange={e => setForm(f => ({ ...f, resolved_date: e.target.value }))} className="form-input" />
        </div>
      </div>
      <div>
        <label className="form-label">Resolution Notes</label>
        <textarea value={form.resolution_notes} onChange={e => setForm(f => ({ ...f, resolution_notes: e.target.value }))} rows={2} className="form-textarea" placeholder="How was this resolved?" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : initial?.id ? 'Update Incident' : 'Create Incident'}</button>
      </div>
    </form>
  );
}

export default function Incidents() {
  const { canEdit } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ type: null, data: null });
  const [closeTarget, setCloseTarget] = useState(null);
  const [closing, setClosing] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await incidentsAPI.getAll({ page, limit: 15, ...(severityFilter && { severity: severityFilter }), ...(statusFilter && { resolution_status: statusFilter }) });
      setIncidents(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  }, [page, severityFilter, statusFilter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await incidentsAPI.close(closeTarget.id);
      toast.success('Incident closed');
      setCloseTarget(null);
      fetchIncidents();
    } catch { toast.error('Failed to close incident'); }
    finally { setClosing(false); }
  };

  const resolutionBadge = { open: 'badge-high', in_progress: 'badge-medium', resolved: 'badge-active', closed: 'badge-draft' };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -10 },
          show: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="page-header no-reveal"
      >
        <div>
          <h1 className="page-title">Breach Incidents</h1>
          <p className="page-subtitle">Track and resolve SLA and contract violations</p>
        </div>
        {canEdit() && (
          <motion.button
            onClick={() => setModal({ type: 'add', data: null })}
            className="btn-primary flex items-center gap-2"
            whileHover={{ 
              backgroundColor: '#1d4ed8', 
              boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
              y: -1
            }}
            whileTap={{ scale: 0.96, y: 0 }}
            initial="initial"
            animate="animate"
          >
            <motion.span
              variants={{
                initial: { rotate: 0 },
                hover: { rotate: 45, scale: 1.1 }
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <Plus size={16} />
            </motion.span>
            <span>Log Incident</span>
          </motion.button>
        )}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-30 card no-reveal p-4 mb-4 flex flex-col sm:flex-row gap-3 overflow-visible animate-fade-in"
      >
        {/* Custom Severity Dropdown */}
        <div className="relative w-full sm:w-36">
          <button
            onClick={() => {
              setSeverityDropdownOpen(!severityDropdownOpen);
              setStatusDropdownOpen(false);
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
                        setPage(1);
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

        {/* Custom Status Dropdown */}
        <div className="relative w-full sm:w-40">
          <button
            onClick={() => {
              setStatusDropdownOpen(!statusDropdownOpen);
              setSeverityDropdownOpen(false);
            }}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{statusFilter ? capitalize(statusFilter.replace('_', ' ')) : 'All Statuses'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ originY: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                >
                  {['', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setStatusDropdownOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        statusFilter === st ? 'text-electric-600 font-medium bg-electric-50/40' : 'text-gray-700'
                      }`}
                    >
                      {st ? capitalize(st.replace('_', ' ')) : 'All Statuses'}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 15 },
          show: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="card no-reveal"
      >
        <div className="table-wrapper">
          {loading ? <LoadingSpinner text="Loading incidents..." /> :
            incidents.length === 0 ? <EmptyState icon={AlertTriangle} title="No incidents found" description="No breach incidents have been logged yet" /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Contract</th>
                    <th className="hidden sm:table-cell">Company</th>
                    <th className="hidden sm:table-cell">Date</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={`${page}-${severityFilter}-${statusFilter}-${incidents.length}`}
                  variants={tbodyVariants}
                  initial="hidden"
                  animate="show"
                >
                  {incidents.map(inc => (
                    <motion.tr
                      key={inc.id}
                      variants={rowVariants}
                      className="group relative hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="relative pl-4 font-medium text-gray-900">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${severityBorderColors[inc.severity] || 'bg-gray-300'} scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-150 origin-center`} />
                        <div className="font-medium text-gray-900">{inc.incident_type}</div>
                        <div className="text-xs text-gray-400">{inc.incident_number}</div>
                      </td>
                      <td className="text-xs">
                        <div className="font-mono text-gray-500">{inc.contract_number}</div>
                      </td>
                      <td className="hidden sm:table-cell text-sm text-gray-600">{inc.company_name}</td>
                      <td className="hidden sm:table-cell text-sm">{formatDate(inc.incident_date)}</td>
                      <td>
                        {inc.severity === 'critical' ? (
                          <motion.span
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(239, 68, 68, 0)",
                                "0 0 8px 1.5px rgba(239, 68, 68, 0.35)",
                                "0 0 0 0px rgba(239, 68, 68, 0)"
                              ]
                            }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            className={`badge ${getSeverityColor(inc.severity)} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                            </span>
                            {capitalize(inc.severity)}
                          </motion.span>
                        ) : inc.severity === 'high' ? (
                          <motion.span
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(249, 115, 22, 0)",
                                "0 0 8px 1.5px rgba(249, 115, 22, 0.35)",
                                "0 0 0 0px rgba(249, 115, 22, 0)"
                              ]
                            }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            className={`badge ${getSeverityColor(inc.severity)} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 [animation-duration:2.5s]"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                            </span>
                            {capitalize(inc.severity)}
                          </motion.span>
                        ) : (
                          <span className={`badge ${getSeverityColor(inc.severity)}`}>
                            {capitalize(inc.severity)}
                          </span>
                        )}
                      </td>
                      <td>
                        {inc.resolution_status === 'open' ? (
                          <motion.span
                            layout
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(249, 115, 22, 0)",
                                "0 0 8px 1.5px rgba(249, 115, 22, 0.35)",
                                "0 0 0 0px rgba(249, 115, 22, 0)"
                              ]
                            }}
                            transition={{
                              boxShadow: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                              default: { duration: 0.2, ease: "easeInOut" }
                            }}
                            className={`badge ${resolutionBadge[inc.resolution_status]} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                            </span>
                            {capitalize(inc.resolution_status)}
                          </motion.span>
                        ) : (
                          <motion.span
                            layout
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className={`badge ${resolutionBadge[inc.resolution_status] || 'badge-draft'}`}
                          >
                            {capitalize(inc.resolution_status?.replace('_', ' '))}
                          </motion.span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-sm text-gray-500">{inc.assigned_to_name || '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {canEdit() && (
                            <ActionButton onClick={() => setModal({ type: 'edit', data: inc })} tooltip="Edit Incident" icon={Edit2} hoverColor="hover:text-blue-600" />
                          )}
                          {canEdit() && inc.resolution_status !== 'closed' && (
                            <ActionButton onClick={() => setCloseTarget(inc)} tooltip="Close Incident" icon={CheckCircle} hoverColor="hover:text-emerald-600" />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            )}
        </div>
        {pagination && <div className="p-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
      </motion.div>

      {(modal.type === 'add' || modal.type === 'edit') && (
        <Modal isOpen onClose={() => setModal({ type: null, data: null })} title={modal.type === 'add' ? 'Log Incident' : 'Edit Incident'} size="lg">
          <IncidentForm initial={modal.data} onSuccess={() => { setModal({ type: null, data: null }); fetchIncidents(); toast.success('Incident saved!'); }} onCancel={() => setModal({ type: null, data: null })} />
        </Modal>
      )}

      <ConfirmDialog isOpen={!!closeTarget} onClose={() => setCloseTarget(null)} onConfirm={handleClose}
        loading={closing} danger={false} title="Close Incident"
        message={`Mark "${closeTarget?.incident_type}" as closed?`} confirmText="Close Incident" />
    </motion.div>
  );
}
