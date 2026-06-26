import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Edit2, Trash2, Archive, Eye, X, FileText } from 'lucide-react';
import { contractsAPI } from '../../api';
import {
  formatCurrency, formatDate, getStatusBadgeClass, getPriorityBadgeClass,
  capitalize, getRenewalUrgency, truncate
} from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ContractForm from './ContractForm';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const STATUSES = ['draft', 'active', 'expired', 'renewed', 'archived'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CONTRACT_TYPES = ['Service Agreement', 'Maintenance Contract', 'SLA Contract', 'NDA', 'Partnership Agreement', 'Consulting Agreement', 'Other'];

const tbodyVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

const ActionButton = ({ onClick, to, tooltip, icon: Icon, hoverColor, className }) => {
  const ButtonContent = (
    <motion.span
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150 ${className || 'btn-ghost text-gray-400 ' + hoverColor}`}
    >
      <Icon size={14} />
    </motion.span>
  );

  return (
    <div className="relative group flex items-center justify-center">
      {to ? (
        <Link to={to}>{ButtonContent}</Link>
      ) : (
        <button onClick={onClick}>{ButtonContent}</button>
      )}
      <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
        {tooltip}
      </span>
    </div>
  );
};

export default function Contracts() {
  const { canEdit, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contracts, setContracts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search input state is kept local for snappy typing
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const searchTimeout = useRef(null);

  // Derive filter parameters directly from query parameters
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const typeFilter = searchParams.get('contract_type') || '';
  const specialFilter = searchParams.get('filter') || '';
  const sort = searchParams.get('sort') || 'created_at';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const filters = { status: statusFilter, priority: priorityFilter, contract_type: typeFilter };
  const [showFilters, setShowFilters] = useState(false);

  const [modalState, setModalState] = useState({ type: null, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        sort,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(typeFilter && { contract_type: typeFilter }),
      };

      if (specialFilter === 'expiring') {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        params.renewal_before = d.toISOString().split('T')[0];
        params.status = 'active';
      }

      const { data } = await contractsAPI.getAll(params);
      setContracts(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, typeFilter, specialFilter, sort]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  // Keep search input synced when query parameter changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateFilters = (newFilters) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(newFilters).forEach(([key, val]) => {
        if (val) next.set(key, val);
        else next.delete(key);
      });
      next.set('page', '1');
      return next;
    });
  };

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (val) next.set('search', val);
        else next.delete('search');
        next.set('page', '1');
        return next;
      });
    }, 300);
  };

  const handleSortChange = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('sort', val);
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
    setActionLoading(true);
    try {
      await contractsAPI.delete(deleteTarget.id);
      toast.success('Contract deleted');
      setDeleteTarget(null);
      fetchContracts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (id) => {
    try {
      const res = await contractsAPI.archive(id);
      toast.success(res.data?.message || 'Contract status updated');
      fetchContracts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed');
    }
  };

  const openModal = (type, data = null) => setModalState({ type, data });
  const closeModal = () => setModalState({ type: null, data: null });

  const handleFormSuccess = () => {
    closeModal();
    fetchContracts();
    toast.success(modalState.type === 'add' ? 'Contract created!' : 'Contract updated!');
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

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
          <h1 className="page-title">Contracts</h1>
          <p className="page-subtitle">{pagination?.total ?? '—'} total contracts</p>
        </div>
        {canEdit() && (
          <motion.button
            onClick={() => openModal('add')}
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
            <span>New Contract</span>
          </motion.button>
        )}
      </motion.div>

      {/* Search & Filters Bar */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="card no-reveal p-4 mb-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchInput} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search contracts, clients, companies..."
              className="form-input pl-9 pr-9" />
            {search && (
              <button onClick={() => { setSearchInput(''); setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('search'); next.set('page', '1'); return next; }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex-1 sm:flex-initial gap-2 ${activeFilterCount > 0 ? 'border-electric-300 text-electric-600' : ''}`}>
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-electric-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
            <select value={sort} onChange={(e) => handleSortChange(e.target.value)} className="form-select flex-1 sm:flex-initial w-full sm:w-44 text-sm">
              <option value="created_at">Newest First</option>
              <option value="end_date">End Date</option>
              <option value="renewal_date">Renewal Date</option>
              <option value="value">Value (High→Low)</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row flex-wrap gap-3 animate-slide-down">
            <select value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })} className="form-select w-full sm:w-36 text-sm">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => updateFilters({ priority: e.target.value })} className="form-select w-full sm:w-36 text-sm">
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            <select value={filters.contract_type} onChange={(e) => updateFilters({ contract_type: e.target.value })} className="form-select w-full sm:w-48 text-sm">
              <option value="">All Types</option>
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
                <X size={13} /> Clear All
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Contracts Table */}
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
            <LoadingSpinner text="Loading contracts..." />
          ) : contracts.length === 0 ? (
            <EmptyState icon={FileText} title="No contracts found"
              description="Try adjusting your filters or search query"
              action={canEdit() ? <button onClick={() => openModal('add')} className="btn-primary">Add First Contract</button> : null} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Client / Company</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Priority</th>
                  <th className="hidden md:table-cell">End Date</th>
                  <th className="hidden md:table-cell">Renewal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody
                key={`${page}-${contracts.length}`}
                variants={tbodyVariants}
                initial="hidden"
                animate="show"
              >
                {contracts.map((c) => {
                  const urgency = getRenewalUrgency(c.renewal_date);
                  const isArchived = c.status === 'archived';
                  return (
                    <motion.tr
                      key={c.id}
                      variants={rowVariants}
                      className="group relative hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="relative pl-4">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          c.priority === 'critical' ? 'bg-red-500' :
                          c.priority === 'high' ? 'bg-orange-500' :
                          c.priority === 'medium' ? 'bg-amber-500' :
                          'bg-electric-500'
                        } scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-150 origin-center`} />
                        <Link to={`/contracts/${c.id}`} className="text-electric-600 hover:underline font-medium block">
                          {truncate(c.title, 35)}
                        </Link>
                        <span className="text-xs text-gray-400">{c.contract_number}</span>
                      </td>
                      <td>
                        <div className="font-medium text-gray-800">{c.customer_name}</div>
                        <div className="text-xs text-gray-400">{c.company_name}</div>
                      </td>
                      <td className="font-semibold text-gray-900">{formatCurrency(c.value, true)}</td>
                      <td>
                        {c.status === 'active' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(16, 185, 129, 0)",
                                "0 0 8px 1.5px rgba(16, 185, 129, 0.3)",
                                "0 0 0 0px rgba(16, 185, 129, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(c.status)}`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : c.status === 'expired' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(239, 68, 68, 0)",
                                "0 0 8px 1.5px rgba(239, 68, 68, 0.3)",
                                "0 0 0 0px rgba(239, 68, 68, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(c.status)}`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : c.status === 'renewed' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(37, 99, 235, 0)",
                                "0 0 8px 1.5px rgba(37, 99, 235, 0.3)",
                                "0 0 0 0px rgba(37, 99, 235, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(c.status)}`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : c.status === 'archived' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(245, 158, 11, 0)",
                                "0 0 8px 1.5px rgba(245, 158, 11, 0.3)",
                                "0 0 0 0px rgba(245, 158, 11, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getStatusBadgeClass(c.status)}`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        ) : (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`badge ${getStatusBadgeClass(c.status)}`}
                          >
                            {capitalize(c.status)}
                          </motion.span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        {c.priority === 'critical' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(239, 68, 68, 0)",
                                "0 0 8px 1.5px rgba(239, 68, 68, 0.35)",
                                "0 0 0 0px rgba(239, 68, 68, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getPriorityBadgeClass(c.priority)} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                            </span>
                            {capitalize(c.priority)}
                          </motion.span>
                        ) : c.priority === 'high' ? (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              boxShadow: [
                                "0 0 0 0px rgba(249, 115, 22, 0)",
                                "0 0 8px 1.5px rgba(249, 115, 22, 0.35)",
                                "0 0 0 0px rgba(249, 115, 22, 0)"
                              ]
                            }}
                            transition={{
                              scale: { duration: 0.15, ease: "easeOut" },
                              opacity: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className={`badge ${getPriorityBadgeClass(c.priority)} inline-flex items-center`}
                          >
                            <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 [animation-duration:2.5s]"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                            </span>
                            {capitalize(c.priority)}
                          </motion.span>
                        ) : (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`badge ${getPriorityBadgeClass(c.priority)}`}
                          >
                            {capitalize(c.priority)}
                          </motion.span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-sm">{formatDate(c.end_date)}</td>
                      <td className="hidden md:table-cell">
                        {urgency && (
                          urgency.color === 'badge-critical' || urgency.color === 'badge-expired' ? (
                            <motion.span
                              animate={{
                                boxShadow: [
                                  "0 0 0 0px rgba(239, 68, 68, 0)",
                                  "0 0 8px 1.5px rgba(239, 68, 68, 0.3)",
                                  "0 0 0 0px rgba(239, 68, 68, 0)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className={`badge ${urgency.color}`}
                            >
                              {urgency.label}
                            </motion.span>
                          ) : urgency.color === 'badge-high' ? (
                            <motion.span
                              animate={{
                                boxShadow: [
                                  "0 0 0 0px rgba(249, 115, 22, 0)",
                                  "0 0 8px 1.5px rgba(249, 115, 22, 0.3)",
                                  "0 0 0 0px rgba(249, 115, 22, 0)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className={`badge ${urgency.color}`}
                            >
                              {urgency.label}
                            </motion.span>
                          ) : urgency.color === 'badge-active' ? (
                            <motion.span
                              animate={{
                                boxShadow: [
                                  "0 0 0 0px rgba(16, 185, 129, 0)",
                                  "0 0 8px 1.5px rgba(16, 185, 129, 0.25)",
                                  "0 0 0 0px rgba(16, 185, 129, 0)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className={`badge ${urgency.color}`}
                            >
                              {urgency.label}
                            </motion.span>
                          ) : (
                            <span className={`badge ${urgency.color}`}>{urgency.label}</span>
                          )
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <ActionButton to={`/contracts/${c.id}`} tooltip="View Contract" icon={Eye} hoverColor="hover:text-electric-600" />
                          {canEdit() && (
                            <>
                              <ActionButton onClick={() => openModal('edit', c)} tooltip="Edit Contract" icon={Edit2} hoverColor="hover:text-blue-600" />
                              <ActionButton 
                                onClick={() => handleArchive(c.id)} 
                                tooltip={isArchived ? "Unarchive Contract" : "Archive Contract"} 
                                icon={Archive} 
                                className={isArchived ? "bg-[#0F1E3C] text-white hover:bg-[#1e3a6e] hover:text-white" : ""}
                                hoverColor="hover:text-amber-600"
                              />
                            </>
                          )}
                          {isAdmin() && (
                            <ActionButton onClick={() => setDeleteTarget(c)} tooltip="Delete Contract" icon={Trash2} hoverColor="hover:text-red-600" />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          )}
        </div>
        {pagination && (
          <div className="p-4">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      {(modalState.type === 'add' || modalState.type === 'edit') && (
        <Modal isOpen onClose={closeModal}
          title={modalState.type === 'add' ? 'New Contract' : 'Edit Contract'}
          size="lg">
          <ContractForm initial={modalState.data} onSuccess={handleFormSuccess} onCancel={closeModal} />
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Delete Contract"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Contract"
      />
    </motion.div>
  );
}
