import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, ChevronDown, FileText } from 'lucide-react';
import { customersAPI } from '../../api';
import { capitalize, getInitials } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const INDUSTRIES = ['Information Technology', 'Banking & Finance', 'Healthcare', 'Manufacturing', 'Retail & E-Commerce', 'Telecom', 'Education', 'Pharmaceuticals', 'Real Estate', 'Logistics & Supply Chain', 'Energy', 'Media & Entertainment', 'FMCG', 'Automotive', 'Insurance', 'Other'];

const F = ({ label, name, required, children, errors }) => (
  <div>
    <label className="form-label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
    {errors[name] && <p className="form-error">{errors[name]}</p>}
  </div>
);

function CustomerForm({ initial, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '', company_name: initial?.company_name || '', email: initial?.email || '',
    phone: initial?.phone || '', address: initial?.address || '', industry: initial?.industry || '',
    country: initial?.country || 'India', status: initial?.status || 'active', notes: initial?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.company_name.trim()) e.company_name = 'Company name is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (initial?.id) await customersAPI.update(initial.id, form);
      else await customersAPI.create(form);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Contact Name" name="name" required errors={errors}>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" className={`form-input ${errors.name ? 'border-red-300' : ''}`} />
        </F>
        <F label="Company Name" name="company_name" required errors={errors}>
          <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company" className={`form-input ${errors.company_name ? 'border-red-300' : ''}`} />
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Email" name="email" errors={errors}>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@company.com" className={`form-input ${errors.email ? 'border-red-300' : ''}`} />
        </F>
        <F label="Phone" name="phone" errors={errors}>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-XXXXXXXXXX" className="form-input" />
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Industry" name="industry" errors={errors}>
          <select value={form.industry} onChange={e => set('industry', e.target.value)} className="form-select">
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </F>
        <F label="Status" name="status" errors={errors}>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="form-select">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>
        </F>
      </div>
      <F label="Address" name="address" errors={errors}>
        <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Address, City, State" className="form-input" />
      </F>
      <F label="Notes" name="notes" errors={errors}>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="form-textarea" placeholder="Additional notes..." />
      </F>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : initial?.id ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
}

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
  hidden: { opacity: 0, y: 12 },
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

export default function Customers() {
  const { canEdit, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ type: null, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimeout = useRef(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customersAPI.getAll({ page, limit: 15, ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSearch = (val) => { setSearch(val); clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => setPage(1), 300); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customersAPI.delete(deleteTarget.id);
      toast.success('Customer deleted');
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  const statusColors = { active: 'badge-active', inactive: 'badge-draft', prospect: 'badge-medium' };

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
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{pagination?.total ?? '—'} total customers</p>
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
            <span>Add Customer</span>
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
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            value={search} 
            onChange={e => handleSearch(e.target.value)} 
            placeholder="Search customers..." 
            className="form-input pl-9 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 transition-all duration-200" 
          />
          {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        
        {/* Custom Popover Dropdown Filter */}
        <div className="relative w-full sm:w-36">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{statusFilter ? capitalize(statusFilter) : 'All Status'}</span>
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
                  {['', 'active', 'inactive', 'prospect'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setDropdownOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        statusFilter === st ? 'text-electric-600 font-medium bg-electric-50/40' : 'text-gray-700'
                      }`}
                    >
                      {st ? capitalize(st) : 'All Status'}
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
          {loading ? <LoadingSpinner text="Loading customers..." /> :
            customers.length === 0 ? (
              <EmptyState icon={Users} title="No customers found"
                action={canEdit() ? <button onClick={() => setModal({ type: 'add' })} className="btn-primary">Add First Customer</button> : null} />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="hidden sm:table-cell">Email</th>
                    <th className="hidden md:table-cell">Phone</th>
                    <th className="hidden md:table-cell">Industry</th>
                    <th className="hidden sm:table-cell">Contracts</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={`${page}-${statusFilter}-${customers.length}`}
                  variants={tbodyVariants}
                  initial="hidden"
                  animate="show"
                >
                  {customers.map(c => (
                    <motion.tr
                      key={c.id}
                      variants={rowVariants}
                      className="group relative hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="relative pl-4">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          c.status === 'active' ? 'bg-emerald-500' :
                          c.status === 'prospect' ? 'bg-amber-500' :
                          'bg-gray-400'
                        } scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-150 origin-center`} />
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-navy-900 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-400">{c.company_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-sm">{c.email || '—'}</td>
                      <td className="hidden md:table-cell text-sm">{c.phone || '—'}</td>
                      <td className="hidden md:table-cell text-sm">{c.industry || '—'}</td>
                      <td className="hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-electric-50 text-electric-700 border border-electric-100/60 whitespace-nowrap">
                          <FileText size={12} className="text-electric-500" />
                          <span>
                            {c.contract_count} {c.contract_count === 1 ? 'contract' : 'contracts'}
                          </span>
                        </span>
                      </td>
                      <td>
                        {c.status === 'active' ? (
                          <motion.span
                            layout
                            animate={{
                              boxShadow: [
                                "0 0 0 0px rgba(16, 185, 129, 0)",
                                "0 0 8px 1.5px rgba(16, 185, 129, 0.3)",
                                "0 0 0 0px rgba(16, 185, 129, 0)"
                              ]
                            }}
                            transition={{
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              default: { duration: 0.2, ease: "easeInOut" }
                            }}
                            className={`${statusColors[c.status] || 'badge-draft'} badge transition-all duration-300`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : c.status === 'prospect' ? (
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
                            className={`${statusColors[c.status] || 'badge-draft'} badge transition-all duration-300`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : (
                          <motion.span
                            layout
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className={`${statusColors[c.status] || 'badge-draft'} badge transition-all duration-300`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {canEdit() && (
                            <ActionButton onClick={() => setModal({ type: 'edit', data: c })} tooltip="Edit Customer" icon={Edit2} hoverColor="hover:text-blue-600" />
                          )}
                          {isAdmin() && (
                            <ActionButton onClick={() => setDeleteTarget(c)} tooltip="Delete Customer" icon={Trash2} hoverColor="hover:text-red-600" />
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
        <Modal isOpen onClose={() => setModal({ type: null, data: null })} title={modal.type === 'add' ? 'Add Customer' : 'Edit Customer'}>
          <CustomerForm initial={modal.data} onSuccess={() => { setModal({ type: null, data: null }); fetchCustomers(); toast.success(modal.type === 'add' ? 'Customer added!' : 'Customer updated!'); }} onCancel={() => setModal({ type: null, data: null })} />
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        loading={deleting} title="Delete Customer" confirmText="Delete Customer"
        message={`Delete "${deleteTarget?.company_name}"? This only works if they have no contracts.`} />
    </motion.div>
  );
}
