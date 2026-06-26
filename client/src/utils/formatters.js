// ── Currency ────────────────────────────────────────────────
export const formatCurrency = (value, compact = false) => {
  if (value === null || value === undefined) return '₹0';
  const num = parseFloat(value);
  if (compact) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(num);
};

// ── Dates ────────────────────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '—';
  const days = daysUntil(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};

// ── Text ─────────────────────────────────────────────────────
export const truncate = (str, maxLen = 40) => {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

// ── Status helpers ───────────────────────────────────────────
export const getStatusBadgeClass = (status) => {
  const map = {
    active: 'badge-active', draft: 'badge-draft', expired: 'badge-expired',
    renewed: 'badge-renewed', archived: 'badge-archived',
    open: 'badge-high', in_progress: 'badge-medium', resolved: 'badge-active', closed: 'badge-draft',
    at_risk: 'badge-high', breached: 'badge-critical',
  };
  return map[status] || 'badge-draft';
};

export const getPriorityBadgeClass = (priority) => {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' };
  return map[priority] || 'badge-draft';
};

export const getSeverityColor = (severity) => {
  const map = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-700 bg-yellow-50',
    high: 'text-orange-700 bg-orange-50',
    critical: 'text-red-700 bg-red-50',
  };
  return map[severity] || 'text-gray-600 bg-gray-50';
};

export const getComplianceColor = (pct) => {
  if (pct >= 95) return '#10b981';
  if (pct >= 90) return '#3b82f6';
  if (pct >= 80) return '#f59e0b';
  return '#ef4444';
};

// ── Renewal urgency ──────────────────────────────────────────
export const getRenewalUrgency = (renewalDate) => {
  const days = daysUntil(renewalDate);
  if (days === null) return null;
  if (days < 0) return { label: 'Expired', color: 'badge-expired' };
  if (days <= 7) return { label: `${days}d left`, color: 'badge-critical' };
  if (days <= 30) return { label: `${days}d left`, color: 'badge-high' };
  return { label: `${days}d left`, color: 'badge-active' };
};
