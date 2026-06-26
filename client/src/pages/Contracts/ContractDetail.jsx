import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Download, Shield, AlertTriangle, Clock, Building2, ChevronRight } from 'lucide-react';
import { contractsAPI } from '../../api';
import { formatCurrency, formatDate, getStatusBadgeClass, getPriorityBadgeClass, capitalize, daysUntil, getSeverityColor } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ContractForm from './ContractForm';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';

const TABS = ['Overview', 'SLA', 'Incidents', 'Activity'];

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await contractsAPI.getById(id);
      setContract(data.data);
    } catch {
      toast.error('Contract not found');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await contractsAPI.delete(id);
      toast.success('Contract deleted');
      navigate('/contracts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(false);
    }
  };

  const exportPDF = () => {
    if (!contract) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 30, 60);
    doc.text('BrandSparkX', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Contract & SLA Compliance Report', 14, 28);
    doc.setDrawColor(37, 99, 235);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(contract.title, 14, 42);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Contract #: ${contract.contract_number}`, 14, 50);

    autoTable(doc, {
      startY: 58,
      head: [['Field', 'Value']],
      body: [
        ['Client', contract.customer_name],
        ['Company', contract.company_name],
        ['Type', contract.contract_type],
        ['Value', formatCurrency(contract.value)],
        ['Status', capitalize(contract.status)],
        ['Priority', capitalize(contract.priority)],
        ['Start Date', formatDate(contract.start_date)],
        ['End Date', formatDate(contract.end_date)],
        ['Renewal Date', formatDate(contract.renewal_date)],
        ['SLA Commitment', contract.sla_commitment || '—'],
        ['Deliverable Timeline', contract.deliverable_timeline || '—'],
        ['Description', contract.description || '—'],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 30, 60] },
    });

    if (contract.sla_commitments?.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['SLA Name', 'Response Time', 'Resolution Time', 'Compliance', 'Status']],
        body: contract.sla_commitments.map(s => [
          s.sla_name, s.target_response_time, s.target_resolution_time,
          `${s.compliance_pct}%`, capitalize(s.status),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(`${contract.contract_number}_report.pdf`);
    toast.success('PDF exported!');
  };

  if (loading) return <LoadingSpinner text="Loading contract..." />;
  if (!contract) return null;

  const daysToRenewal = daysUntil(contract.renewal_date);
  const urgencyColor = daysToRenewal !== null && daysToRenewal <= 7 ? 'text-red-600 bg-red-50 border-red-200' :
    daysToRenewal !== null && daysToRenewal <= 30 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-electric-600 bg-blue-50 border-blue-200';

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/contracts" className="hover:text-electric-600 transition-colors">Contracts</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium truncate">{contract.title}</span>
      </div>

      {/* Header */}
      <div className="card p-6 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {contract.status === 'active' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(16, 185, 129, 0)",
                      "0 0 8px 1.5px rgba(16, 185, 129, 0.3)",
                      "0 0 0 0px rgba(16, 185, 129, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getStatusBadgeClass(contract.status)}`}
                >
                  {capitalize(contract.status)}
                </motion.span>
              ) : contract.status === 'expired' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(239, 68, 68, 0)",
                      "0 0 8px 1.5px rgba(239, 68, 68, 0.3)",
                      "0 0 0 0px rgba(239, 68, 68, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getStatusBadgeClass(contract.status)}`}
                >
                  {capitalize(contract.status)}
                </motion.span>
              ) : contract.status === 'renewed' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(37, 99, 235, 0)",
                      "0 0 8px 1.5px rgba(37, 99, 235, 0.3)",
                      "0 0 0 0px rgba(37, 99, 235, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getStatusBadgeClass(contract.status)}`}
                >
                  {capitalize(contract.status)}
                </motion.span>
              ) : contract.status === 'archived' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(245, 158, 11, 0)",
                      "0 0 8px 1.5px rgba(245, 158, 11, 0.3)",
                      "0 0 0 0px rgba(245, 158, 11, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getStatusBadgeClass(contract.status)}`}
                >
                  {capitalize(contract.status)}
                </motion.span>
              ) : (
                <span className={`badge ${getStatusBadgeClass(contract.status)}`}>{capitalize(contract.status)}</span>
              )}

              {contract.priority === 'critical' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(239, 68, 68, 0)",
                      "0 0 8px 1.5px rgba(239, 68, 68, 0.35)",
                      "0 0 0 0px rgba(239, 68, 68, 0)"
                    ]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getPriorityBadgeClass(contract.priority)} inline-flex items-center`}
                >
                  <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  {capitalize(contract.priority)}
                </motion.span>
              ) : contract.priority === 'high' ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(249, 115, 22, 0)",
                      "0 0 8px 1.5px rgba(249, 115, 22, 0.35)",
                      "0 0 0 0px rgba(249, 115, 22, 0)"
                    ]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className={`badge ${getPriorityBadgeClass(contract.priority)} inline-flex items-center`}
                >
                  <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 [animation-duration:2.5s]"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                  </span>
                  {capitalize(contract.priority)}
                </motion.span>
              ) : (
                <span className={`badge ${getPriorityBadgeClass(contract.priority)}`}>
                  {capitalize(contract.priority)}
                </span>
              )}
              <span className="text-xs text-gray-400 font-mono">{contract.contract_number}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{contract.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><Building2 size={13} />{contract.company_name}</span>
              <span>{contract.customer_email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportPDF} className="btn-secondary gap-2">
              <Download size={15} /> Export PDF
            </button>
            {canEdit() && (
              <button onClick={() => setEditOpen(true)} className="btn-secondary gap-2">
                <Edit2 size={15} /> Edit
              </button>
            )}
            {isAdmin() && (
              <button onClick={() => setDeleteOpen(true)} className="btn-danger gap-2">
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contract Value</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(contract.value)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Duration</div>
            <div className="text-sm font-medium text-gray-900">{formatDate(contract.start_date)} → {formatDate(contract.end_date)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Renewal Date</div>
            {contract.renewal_date ? (
              <div className={`text-sm font-semibold px-2.5 py-1 rounded-lg border inline-block ${urgencyColor}`}>
                {formatDate(contract.renewal_date)}
                {daysToRenewal !== null && <span className="ml-1">({daysToRenewal}d)</span>}
              </div>
            ) : <div className="text-sm text-gray-400">Not set</div>}
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">SLA / Incidents</div>
            <div className="text-sm font-medium text-gray-900">
              {contract.sla_commitments?.length || 0} SLAs · {contract.breach_incidents?.length || 0} Incidents
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-full max-w-full overflow-x-auto custom-scroll whitespace-nowrap">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
            {tab === 'SLA' && contract.sla_commitments?.length > 0 && (
              <span className="ml-1.5 bg-electric-100 text-electric-700 text-xs px-1.5 rounded-full">{contract.sla_commitments.length}</span>
            )}
            {tab === 'Incidents' && contract.breach_incidents?.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-700 text-xs px-1.5 rounded-full">{contract.breach_incidents.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Contract Details */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Contract Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Contract Type', contract.contract_type],
                  ['SLA Commitment', contract.sla_commitment || '—'],
                  ['Deliverable Timeline', contract.deliverable_timeline || '—'],
                  ['Created By', contract.created_by_name || '—'],
                  ['Created Date', formatDate(contract.created_at)],
                  ['Last Updated', formatDate(contract.updated_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
                    <dd className="text-sm font-medium text-gray-800 mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
              {contract.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</dt>
                  <dd className="text-sm text-gray-700 leading-relaxed">{contract.description}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-3">
              {[
                ['Name', contract.customer_name],
                ['Company', contract.company_name],
                ['Email', contract.customer_email],
                ['Phone', contract.customer_phone || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-sm font-medium text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SLA' && (
        <div className="card">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Shield size={16} className="text-electric-500" />
            <h3 className="font-semibold text-gray-900">SLA Commitments</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {contract.sla_commitments?.map(sla => (
              <div key={sla.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{sla.sla_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Last reviewed: {formatDate(sla.last_review_date)}</div>
                  </div>
                  {sla.status === 'breached' ? (
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0 0px rgba(239, 68, 68, 0)",
                          "0 0 8px 1.5px rgba(239, 68, 68, 0.3)",
                          "0 0 0 0px rgba(239, 68, 68, 0)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`badge ${getStatusBadgeClass(sla.status)}`}
                    >
                      {capitalize(sla.status)}
                    </motion.span>
                  ) : sla.status === 'at_risk' ? (
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0 0px rgba(245, 158, 11, 0)",
                          "0 0 8px 1.5px rgba(245, 158, 11, 0.3)",
                          "0 0 0 0px rgba(245, 158, 11, 0)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`badge ${getStatusBadgeClass(sla.status)} inline-flex items-center`}
                    >
                      <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      {capitalize(sla.status)}
                    </motion.span>
                  ) : sla.status === 'active' ? (
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0 0px rgba(16, 185, 129, 0)",
                          "0 0 8px 1.5px rgba(16, 185, 129, 0.25)",
                          "0 0 0 0px rgba(16, 185, 129, 0)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`badge ${getStatusBadgeClass(sla.status)} inline-flex items-center`}
                    >
                      {capitalize(sla.status)}
                    </motion.span>
                  ) : (
                    <span className={`badge ${getStatusBadgeClass(sla.status)}`}>{capitalize(sla.status)}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Response Time</div>
                    <div className="text-sm font-medium">{sla.target_response_time}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Resolution Time</div>
                    <div className="text-sm font-medium">{sla.target_resolution_time}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Compliance</div>
                    <div className={`text-sm font-bold ${parseFloat(sla.compliance_pct) >= 90 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {sla.compliance_pct}%
                    </div>
                  </div>
                </div>
                <div className="compliance-bar">
                  <div className="compliance-fill" style={{
                    width: `${sla.compliance_pct}%`,
                    background: parseFloat(sla.compliance_pct) >= 95 ? '#10b981' : parseFloat(sla.compliance_pct) >= 90 ? '#3b82f6' : parseFloat(sla.compliance_pct) >= 80 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
              </div>
            ))}
            {!contract.sla_commitments?.length && (
              <div className="p-8 text-center text-gray-400 text-sm">No SLA commitments attached</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Incidents' && (
        <div className="card">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">Breach Incidents</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {contract.breach_incidents?.map(inc => (
              <div key={inc.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{inc.incident_type}</div>
                    <div className="text-xs text-gray-400">{inc.incident_number} · {formatDate(inc.incident_date)}</div>
                  </div>
                  <div className="flex gap-2">
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
                      <span className={`badge ${getSeverityColor(inc.severity)}`}>{capitalize(inc.severity)}</span>
                    )}

                    {inc.resolution_status === 'open' ? (
                      <motion.span
                        animate={{
                          boxShadow: [
                            "0 0 0 0px rgba(249, 115, 22, 0)",
                            "0 0 8px 1.5px rgba(249, 115, 22, 0.3)",
                            "0 0 0 0px rgba(249, 115, 22, 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className={`badge ${getStatusBadgeClass(inc.resolution_status)} inline-flex items-center`}
                      >
                        <span className="relative flex h-1.5 w-1.5 mr-1.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                        </span>
                        {capitalize(inc.resolution_status)}
                      </motion.span>
                    ) : inc.resolution_status === 'in_progress' ? (
                      <span className={`badge ${getStatusBadgeClass(inc.resolution_status)} inline-flex items-center`}>
                        {capitalize(inc.resolution_status?.replace('_', ' '))}
                      </span>
                    ) : (
                      <span className={`badge ${getStatusBadgeClass(inc.resolution_status)}`}>{capitalize(inc.resolution_status)}</span>
                    )}
                  </div>
                </div>
                {inc.description && <p className="text-sm text-gray-600">{inc.description}</p>}
                {inc.root_cause && <p className="text-xs text-gray-400 mt-1">Root cause: {inc.root_cause}</p>}
                {inc.assigned_to_name && <p className="text-xs text-gray-400 mt-1">Assigned to: {inc.assigned_to_name}</p>}
              </div>
            ))}
            {!contract.breach_incidents?.length && (
              <div className="p-8 text-center text-gray-400 text-sm">No breach incidents recorded</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="card">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">Activity Log</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {contract.activity_logs?.map((log, i) => {
              const actionColors = { created: 'bg-emerald-100 text-emerald-700', updated: 'bg-blue-100 text-blue-700', deleted: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', viewed: 'bg-gray-100 text-gray-500' };
              return (
                <div key={log.id || i} className="flex items-center gap-3 p-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                  <span className="text-sm text-gray-700 flex-1">{log.user_name || 'System'}</span>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <Modal isOpen onClose={() => setEditOpen(false)} title="Edit Contract" size="lg">
          <ContractForm initial={contract} onSuccess={() => { setEditOpen(false); fetchContract(); toast.success('Contract updated!'); }} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}

      <ConfirmDialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        loading={deleting} title="Delete Contract"
        message={`Permanently delete "${contract.title}"? All related SLA, incidents, and alerts will be removed.`}
        confirmText="Delete Contract" />
    </div>
  );
}
