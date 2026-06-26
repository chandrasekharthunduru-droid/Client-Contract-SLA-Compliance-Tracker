import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Shield, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { slaAPI, contractsAPI } from '../../api';
import { formatDate, capitalize, getStatusBadgeClass, getComplianceColor } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const borderAccentColors = {
  active: 'bg-emerald-500',
  at_risk: 'bg-amber-500',
  breached: 'bg-red-500',
  inactive: 'bg-gray-400'
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

function SLAForm({ initial, onSuccess, onCancel }) {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({
    contract_id: initial?.contract_id || '', sla_name: initial?.sla_name || '',
    target_response_time: initial?.target_response_time || '',
    target_resolution_time: initial?.target_resolution_time || '',
    status: initial?.status || 'active', compliance_pct: initial?.compliance_pct || 100,
    last_review_date: initial?.last_review_date?.split('T')[0] || '', notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { contractsAPI.getAll({ limit: 100, status: 'active' }).then(({ data }) => setContracts(data.data)).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contract_id || !form.sla_name) { toast.error('Contract and SLA name are required'); return; }
    setSaving(true);
    try {
      if (initial?.id) await slaAPI.update(initial.id, form);
      else await slaAPI.create(form);
      onSuccess();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Contract <span className="text-red-400">*</span></label>
        <select value={form.contract_id} onChange={e => setForm(f => ({ ...f, contract_id: e.target.value }))} className="form-select">
          <option value="">Select contract...</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.title.slice(0, 40)}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">SLA Name <span className="text-red-400">*</span></label>
        <input value={form.sla_name} onChange={e => setForm(f => ({ ...f, sla_name: e.target.value }))} placeholder="e.g. 24x7 Support SLA" className="form-input" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Target Response Time</label>
          <input value={form.target_response_time} onChange={e => setForm(f => ({ ...f, target_response_time: e.target.value }))} placeholder="e.g. 4 hours" className="form-input" />
        </div>
        <div>
          <label className="form-label">Target Resolution Time</label>
          <input value={form.target_resolution_time} onChange={e => setForm(f => ({ ...f, target_resolution_time: e.target.value }))} placeholder="e.g. 24 hours" className="form-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-select">
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="breached">Breached</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="form-label">Compliance %</label>
          <input type="number" min="0" max="100" step="0.1" value={form.compliance_pct} onChange={e => setForm(f => ({ ...f, compliance_pct: e.target.value }))} className="form-input" />
        </div>
        <div>
          <label className="form-label">Last Review Date</label>
          <input type="date" value={form.last_review_date} onChange={e => setForm(f => ({ ...f, last_review_date: e.target.value }))} className="form-input" />
        </div>
      </div>
      <div>
        <label className="form-label">Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="form-textarea" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : initial?.id ? 'Update SLA' : 'Create SLA'}</button>
      </div>
    </form>
  );
}

export default function SLAManagement() {
  const { canEdit, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [slas, setSLAs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive status filter and page from query parameters
  const statusFilter = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modal, setModal] = useState({ type: null, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSLAs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await slaAPI.getAll({ page, limit: 15, ...(statusFilter && { status: statusFilter }) });
      setSLAs(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load SLAs'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchSLAs(); }, [fetchSLAs]);

  const setStatusFilter = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set('status', val);
      else next.delete('status');
      next.set('page', '1');
      return next;
    });
  };

  const setPage = (p) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await slaAPI.delete(deleteTarget.id);
      toast.success('SLA deleted');
      setDeleteTarget(null);
      fetchSLAs();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

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
          <h1 className="page-title">SLA Management</h1>
          <p className="page-subtitle">Track and monitor SLA commitments and compliance</p>
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
                hover: { rotate: 90, scale: 1.1 }
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <Plus size={16} />
            </motion.span>
            <span>New SLA</span>
          </motion.button>
        )}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-30 card no-reveal p-4 mb-4 flex flex-col sm:flex-row gap-3 overflow-visible"
      >
        {/* Custom Status Dropdown Filter */}
        <div className="relative w-full sm:w-40">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{statusFilter ? capitalize(statusFilter.replace('_', ' ')) : 'All Statuses'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ originY: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                >
                  {['', 'active', 'at_risk', 'breached', 'inactive'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setDropdownOpen(false);
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
          {loading ? <LoadingSpinner text="Loading SLAs..." /> :
            slas.length === 0 ? <EmptyState icon={Shield} title="No SLA commitments found" /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SLA Name</th>
                    <th>Contract</th>
                    <th className="hidden sm:table-cell">Company</th>
                    <th className="hidden md:table-cell">Response Time</th>
                    <th className="hidden md:table-cell">Resolution Time</th>
                    <th>Compliance</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Last Review</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={`${page}-${statusFilter}-${slas.length}`}
                  variants={tbodyVariants}
                  initial="hidden"
                  animate="show"
                >
                  {slas.map(s => (
                    <motion.tr
                      key={s.id}
                      variants={rowVariants}
                      className="group relative hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="relative pl-4 font-medium text-gray-900">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderAccentColors[s.status] || 'bg-gray-300'} scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-150 origin-center`} />
                        {s.sla_name}
                      </td>
                      <td>
                        <div className="text-xs font-mono text-gray-500">{s.contract_number}</div>
                        <div className="text-xs text-gray-700 max-w-[140px] truncate">{s.contract_title}</div>
                      </td>
                      <td className="hidden sm:table-cell text-sm text-gray-600">{s.company_name}</td>
                      <td className="hidden md:table-cell text-sm">{s.target_response_time || '—'}</td>
                      <td className="hidden md:table-cell text-sm">{s.target_resolution_time || '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="compliance-bar w-16">
                            <motion.div 
                              className="compliance-fill" 
                              initial={{ width: "0%" }}
                              animate={{ width: `${s.compliance_pct}%` }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              style={{ background: getComplianceColor(parseFloat(s.compliance_pct)) }} 
                            />
                          </div>
                          <span className="text-sm font-semibold" style={{ color: getComplianceColor(parseFloat(s.compliance_pct)) }}>
                            {s.compliance_pct}%
                          </span>
                        </div>
                      </td>
                      <td>
                        {s.status === 'breached' ? (
                          <motion.span
                            layout
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(239, 68, 68, 0)",
                                "0 0 8px 1.5px rgba(239, 68, 68, 0.3)",
                                "0 0 0 0px rgba(239, 68, 68, 0)"
                              ]
                            }}
                            transition={{
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              default: { duration: 0.2, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(s.status)}`}
                          >
                            {capitalize(s.status)}
                          </motion.span>
                        ) : s.status === 'at_risk' ? (
                          <motion.span
                            layout
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(245, 158, 11, 0)",
                                "0 0 8px 1.5px rgba(245, 158, 11, 0.3)",
                                "0 0 0 0px rgba(245, 158, 11, 0)"
                              ]
                            }}
                            transition={{
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              default: { duration: 0.2, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(s.status)} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            {capitalize(s.status)}
                          </motion.span>
                        ) : s.status === 'active' ? (
                          <motion.span
                            layout
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(16, 185, 129, 0)",
                                "0 0 8px 1.5px rgba(16, 185, 129, 0.25)",
                                "0 0 0 0px rgba(16, 185, 129, 0)"
                              ]
                            }}
                            transition={{
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              default: { duration: 0.2, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(s.status)} inline-flex items-center`}
                          >
                            {capitalize(s.status)}
                          </motion.span>
                        ) : (
                          <motion.span
                            layout
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className={`badge ${getStatusBadgeClass(s.status)} inline-flex items-center`}
                          >
                            {capitalize(s.status)}
                          </motion.span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell text-sm text-gray-500">{formatDate(s.last_review_date)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {canEdit() && (
                            <ActionButton onClick={() => setModal({ type: 'edit', data: s })} tooltip="Edit SLA" icon={Edit2} hoverColor="hover:text-blue-600" />
                          )}
                          {isAdmin() && (
                            <ActionButton onClick={() => setDeleteTarget(s)} tooltip="Delete SLA" icon={Trash2} hoverColor="hover:text-red-600" />
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
        <Modal isOpen onClose={() => setModal({ type: null, data: null })} title={modal.type === 'add' ? 'New SLA Commitment' : 'Edit SLA'}>
          <SLAForm initial={modal.data} onSuccess={() => { setModal({ type: null, data: null }); fetchSLAs(); toast.success('SLA saved!'); }} onCancel={() => setModal({ type: null, data: null })} />
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        loading={deleting} title="Delete SLA" message={`Delete "${deleteTarget?.sla_name}"?`} confirmText="Delete SLA" />
    </motion.div>
  );
}
