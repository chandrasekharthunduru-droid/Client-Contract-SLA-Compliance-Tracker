import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Mail, ChevronDown, User } from 'lucide-react';
import { usersAPI } from '../../api';
import { formatDate, capitalize, getInitials } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = ['admin', 'manager', 'staff'];
const STATUSES = ['Active', 'On Leave', 'Inactive'];

const checkPasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  
  if (score <= 2) {
    return { score, label: 'Weak', color: 'text-red-700 bg-red-50 border-red-200' };
  }
  if (score === 3 || score === 4) {
    return { score, label: 'Medium', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  }
  return { score, label: 'Strong', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
};

function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function StaffForm({ initial, onSuccess, onCancel, currentUserId }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    password: '',
    role: initial?.role || 'staff',
    working_on: initial?.working_on || '',
    employee_status: initial?.employee_status || 'Active',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
    
    // Password is only required for new staff members
    if (!initial?.id && !form.password.trim()) {
      e.password = 'Password is required';
    } else if (form.password.trim()) {
      const strength = checkPasswordStrength(form.password);
      if (strength.label === 'Weak') {
        e.password = 'Password is too weak. Must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.';
      }
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial?.id) {
        // Prepare patch/update payload. If password is empty, don't send it.
        const payload = { ...form };
        if (!payload.password.trim()) {
          delete payload.password;
        }
        await usersAPI.update(initial.id, payload);
      } else {
        await usersAPI.create(form);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Name" error={errors.name} required>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Full name"
            className={`form-input ${errors.name ? 'border-red-300' : ''}`}
            required
          />
        </FormField>
        <FormField label="Email Address" error={errors.email} required>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="email@company.com"
            className={`form-input ${errors.email ? 'border-red-300' : ''}`}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={initial?.id ? "Change Password (Optional)" : "Password"} error={errors.password} required={!initial?.id}>
          <input
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder={initial?.id ? "Leave blank to keep same" : "Password (min 8 chars)"}
            className={`form-input ${errors.password ? 'border-red-300' : ''}`}
            required={!initial?.id}
          />
          {form.password && (
            <div className={`mt-1.5 text-[11px] px-2 py-0.5 rounded border inline-block font-semibold ${checkPasswordStrength(form.password).color}`}>
              Password Strength: {checkPasswordStrength(form.password).label}
            </div>
          )}
        </FormField>
        <FormField label="Role" error={errors.role} required>
          <select
            value={form.role}
            onChange={e => set('role', e.target.value)}
            disabled={initial?.id === currentUserId}
            className="form-select font-medium"
            required
          >
            {ROLES.map(r => <option key={r} value={r}>{capitalize(r)}</option>)}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Employee Status" error={errors.employee_status} required>
          <select
            value={form.employee_status}
            disabled={initial?.id === currentUserId}
            onChange={e => set('employee_status', e.target.value)}
            className="form-select font-medium"
            required
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Currently Working On" error={errors.working_on}>
          <input
            value={form.working_on}
            onChange={e => set('working_on', e.target.value)}
            placeholder="e.g. Auditing contract templates..."
            className="form-input"
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : initial?.id ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}

const ActionButton = ({ onClick, tooltip, icon: Icon, hoverColor, disabled }) => {
  return (
    <div className="relative group flex items-center justify-center">
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.15 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
        className={`btn-ghost p-1.5 ${disabled ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 cursor-pointer'} ${hoverColor} rounded-lg flex items-center justify-center`}
      >
        <Icon size={14} />
      </motion.button>
      {!disabled && (
        <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
          {tooltip}
        </span>
      )}
    </div>
  );
};

export default function StaffManagement() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modal, setModal] = useState({ type: null, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimeout = useRef(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersAPI.getAll({ search });
      let filtered = data.data || [];
      if (roleFilter) {
        filtered = filtered.filter(u => u.role === roleFilter);
      }
      setStaffList(filtered);
    } catch {
      toast.error('Failed to load staff details');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchStaff(), 300);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await usersAPI.delete(deleteTarget.id);
      toast.success('Employee deleted successfully');
      setDeleteTarget(null);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const statusColors = {
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-100/60',
    'On Leave': 'bg-amber-50 text-amber-700 border-amber-100/60',
    'Inactive': 'bg-rose-50 text-rose-700 border-rose-100/60'
  };

  const roleColors = {
    'admin': 'bg-purple-50 text-purple-700 border-purple-100/60',
    'manager': 'bg-blue-50 text-blue-700 border-blue-100/60',
    'staff': 'bg-slate-50 text-slate-700 border-slate-100/60'
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
          <h1 className="page-title">Staff Details</h1>
          <p className="page-subtitle">{staffList.length} total employees</p>
        </div>
        <motion.button
          onClick={() => setModal({ type: 'add', data: null })}
          className="btn-primary flex items-center gap-2"
          whileHover={{ 
            backgroundColor: '#1d4ed8', 
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
            y: -1
          }}
          whileTap={{ scale: 0.96, y: 0 }}
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </motion.button>
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
            placeholder="Search employees by name or email..." 
            className="form-input pl-9 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 transition-all duration-200" 
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchStaff(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* Role popover filter */}
        <div className="relative w-full sm:w-36">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="form-select w-full text-sm text-left flex items-center justify-between cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-4 focus:ring-electric-500/10 focus:border-electric-500 focus:outline-none transition-all duration-200"
          >
            <span>{roleFilter ? capitalize(roleFilter) : 'All Roles'}</span>
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
                  {['', 'admin', 'manager', 'staff'].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRoleFilter(r);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        roleFilter === r ? 'text-electric-600 font-medium bg-electric-50/40' : 'text-gray-700'
                      }`}
                    >
                      {r ? capitalize(r) : 'All Roles'}
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
          {loading ? (
            <LoadingSpinner text="Loading staff directory..." />
          ) : staffList.length === 0 ? (
            <EmptyState 
              icon={User} 
              title="No employees found"
              action={<button onClick={() => setModal({ type: 'add' })} className="btn-primary">Add Employee</button>} 
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="hidden md:table-cell">Current Tasks (Working On)</th>
                  <th className="hidden sm:table-cell">Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(emp => (
                  <tr key={emp.id} className="group relative hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="relative pl-4">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        emp.employee_status === 'Active' ? 'bg-emerald-500' :
                        emp.employee_status === 'On Leave' ? 'bg-amber-500' :
                        'bg-gray-400'
                      } scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-150 origin-center`} />
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy-900 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{emp.name} {emp.id === user.id && <span className="text-xs text-gray-400 font-normal">(You)</span>}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail size={11} />
                            <span>{emp.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge border text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[emp.role]}`}>
                        {capitalize(emp.role)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={`badge border text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusColors[emp.employee_status]}`}>
                        {emp.employee_status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={emp.working_on}>
                        {emp.working_on || <span className="text-gray-300 italic">No assigned task</span>}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell text-sm text-gray-500">
                      {emp.last_login ? formatDate(emp.last_login) : <span className="text-gray-300">Never</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <ActionButton 
                          onClick={() => setModal({ type: 'edit', data: emp })} 
                          tooltip="Edit Employee" 
                          icon={Edit2} 
                          hoverColor="hover:text-blue-600" 
                        />
                        <ActionButton 
                          onClick={() => setDeleteTarget(emp)} 
                          tooltip="Delete Employee" 
                          icon={Trash2} 
                          hoverColor="hover:text-red-600" 
                          disabled={emp.id === user.id} 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {(modal.type === 'add' || modal.type === 'edit') && (
        <Modal 
          isOpen 
          onClose={() => setModal({ type: null, data: null })} 
          title={modal.type === 'add' ? 'Add Employee Details' : 'Edit Employee Details'}
        >
          <StaffForm 
            initial={modal.data} 
            currentUserId={user.id}
            onSuccess={() => { 
              setModal({ type: null, data: null }); 
              fetchStaff(); 
              toast.success(modal.type === 'add' ? 'Employee details saved!' : 'Employee details updated!'); 
            }} 
            onCancel={() => setModal({ type: null, data: null })} 
          />
        </Modal>
      )}

      <ConfirmDialog 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete}
        loading={deleting} 
        title="Delete Employee Account" 
        confirmText="Delete Account"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action will revoke their access to the BrandSparkX portal permanently.`} 
      />
    </motion.div>
  );
}
