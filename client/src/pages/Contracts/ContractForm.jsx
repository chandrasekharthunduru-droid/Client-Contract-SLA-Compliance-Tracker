import { useState, useEffect } from 'react';
import { customersAPI, contractsAPI } from '../../api';
import toast from 'react-hot-toast';

const CONTRACT_TYPES = ['Service Agreement', 'Maintenance Contract', 'SLA Contract', 'NDA', 'Partnership Agreement', 'Consulting Agreement', 'Other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['draft', 'active', 'expired', 'renewed', 'archived'];

const F = ({ label, name, required, children, hint, errors }) => (
  <div>
    <label className="form-label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
    {errors[name] && <p className="form-error">{errors[name]}</p>}
    {hint && !errors[name] && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

export default function ContractForm({ initial, onSuccess, onCancel }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer_id: initial?.customer_id || '',
    title: initial?.title || '',
    contract_type: initial?.contract_type || 'Service Agreement',
    value: initial?.value || '',
    start_date: initial?.start_date?.split('T')[0] || '',
    end_date: initial?.end_date?.split('T')[0] || '',
    renewal_date: initial?.renewal_date?.split('T')[0] || '',
    deliverable_timeline: initial?.deliverable_timeline || '',
    sla_commitment: initial?.sla_commitment || '',
    priority: initial?.priority || 'medium',
    status: initial?.status || 'draft',
    description: initial?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersAPI.getAll({ limit: 100 }).then(({ data }) => setCustomers(data.data)).catch(() => {});
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.customer_id) e.customer_id = 'Customer is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.start_date) e.start_date = 'Start date is required';
    if (!form.end_date) e.end_date = 'End date is required';
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      e.end_date = 'End date must be after start date';
    }
    if (form.renewal_date && form.start_date && new Date(form.renewal_date) < new Date(form.start_date)) {
      e.renewal_date = 'Renewal date cannot be before start date';
    }
    if (form.value && parseFloat(form.value) < 0) e.value = 'Value must be positive';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await contractsAPI.update(initial.id, form);
      } else {
        await contractsAPI.create(form);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Customer" name="customer_id" required errors={errors}>
          <select value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)} className={`form-select ${errors.customer_id ? 'border-red-300' : ''}`}>
            <option value="">Select a customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name} — {c.name}</option>)}
          </select>
        </F>
        <F label="Contract Type" name="contract_type" errors={errors}>
          <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)} className="form-select">
            {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </F>
      </div>

      <F label="Contract Title" name="title" required errors={errors}>
        <input value={form.title} onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Annual IT Support Agreement — TechCorp"
          className={`form-input ${errors.title ? 'border-red-300' : ''}`} />
      </F>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="Start Date" name="start_date" required errors={errors}>
          <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)}
            className={`form-input ${errors.start_date ? 'border-red-300' : ''}`} />
        </F>
        <F label="End Date" name="end_date" required errors={errors}>
          <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)}
            className={`form-input ${errors.end_date ? 'border-red-300' : ''}`} />
        </F>
        <F label="Renewal Date" name="renewal_date" hint="Auto-alerts will trigger at ≤30d" errors={errors}>
          <input type="date" value={form.renewal_date} onChange={(e) => set('renewal_date', e.target.value)}
            className={`form-input ${errors.renewal_date ? 'border-red-300' : ''}`} />
        </F>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="Contract Value (₹)" name="value" errors={errors}>
          <input type="number" value={form.value} onChange={(e) => set('value', e.target.value)}
            placeholder="0.00" min="0" className={`form-input ${errors.value ? 'border-red-300' : ''}`} />
        </F>
        <F label="Priority" name="priority" errors={errors}>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="form-select">
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </F>
        <F label="Status" name="status" errors={errors}>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className="form-select">
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </F>
      </div>

      <F label="SLA Commitment" name="sla_commitment" errors={errors}>
        <input value={form.sla_commitment} onChange={(e) => set('sla_commitment', e.target.value)}
          placeholder="e.g. 4hr response time; 24hr resolution" className="form-input" />
      </F>

      <F label="Deliverable Timeline" name="deliverable_timeline" errors={errors}>
        <input value={form.deliverable_timeline} onChange={(e) => set('deliverable_timeline', e.target.value)}
          placeholder="e.g. 90 days from contract start" className="form-input" />
      </F>

      <F label="Description" name="description" errors={errors}>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          rows={3} placeholder="Contract notes and description..." className="form-textarea" />
      </F>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : initial?.id ? 'Update Contract' : 'Create Contract'}
        </button>
      </div>
    </form>
  );
}
