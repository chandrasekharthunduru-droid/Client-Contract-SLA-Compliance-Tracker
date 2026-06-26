/**
 * Mock API for demo mode - works without a backend server.
 * Returns realistic data so the full UI can be demonstrated.
 */

import { MOCK_USERS, MOCK_CUSTOMERS, MOCK_CONTRACTS, MOCK_SLAS, MOCK_INCIDENTS, MOCK_ALERTS, MOCK_DASHBOARD } from './mockData';

// Simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Storage helpers
const loadFromStorage = (key, defaultData) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultData;
  } catch {
    return defaultData;
  }
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

let localContracts = loadFromStorage('bsx_mock_contracts', MOCK_CONTRACTS);
let localCustomers = loadFromStorage('bsx_mock_customers', MOCK_CUSTOMERS);
let localSLAs = loadFromStorage('bsx_mock_slas', MOCK_SLAS);
let localIncidents = loadFromStorage('bsx_mock_incidents', MOCK_INCIDENTS);
let localAlerts = loadFromStorage('bsx_mock_alerts', MOCK_ALERTS);
let localUsers = loadFromStorage('bsx_mock_users', MOCK_USERS);

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ── Pagination helper ───────────────────────────────────────
function paginate(arr, page = 1, limit = 15) {
  const total = arr.length;
  const pages = Math.ceil(total / limit);
  const data = arr.slice((page - 1) * limit, page * limit);
  return { data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages } };
}

// ── Filter helper ───────────────────────────────────────────
function filterArray(arr, params = {}) {
  let result = [...arr];
  const { search, status, priority, contract_type, severity, resolution_status } = params;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(item =>
      Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
    );
  }
  if (status) result = result.filter(i => i.status === status);
  if (priority) result = result.filter(i => i.priority === priority);
  if (contract_type) result = result.filter(i => i.contract_type === contract_type);
  if (severity) result = result.filter(i => i.severity === severity);
  if (resolution_status) result = result.filter(i => i.resolution_status === resolution_status);

  return result;
}

// ═══════════════════════════════════════════════════════════
// MOCK API IMPLEMENTATION
// ═══════════════════════════════════════════════════════════

export const mockAuthAPI = {
  login: async ({ email, password }) => {
    await delay(600);
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || password !== 'Password123!') {
      throw { response: { data: { message: 'Invalid email or password.' } } };
    }
    const token = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 7 * 86400000 }));
    return { data: { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } };
  },
  logout: async () => { await delay(200); return { data: { success: true } }; },
  me: async () => {
    await delay(100);
    const token = localStorage.getItem('bsx_token');
    if (!token) throw { response: { status: 401 } };
    const payload = JSON.parse(atob(token));
    const user = MOCK_USERS.find(u => u.id === payload.id);
    return { data: { success: true, user } };
  },
};

export const mockDashboardAPI = {
  getSummary: async () => {
    await delay(500);
    return { data: { success: true, data: MOCK_DASHBOARD } };
  },
};

export const mockContractsAPI = {
  getAll: async (params = {}) => {
    await delay(400);
    const filtered = filterArray(localContracts, params);
    const result = paginate(filtered, params.page, params.limit || 15);
    return { data: { success: true, ...result } };
  },
  getById: async (id) => {
    await delay(300);
    const contract = localContracts.find(c => c.id === id);
    if (!contract) throw { response: { data: { message: 'Contract not found.' } } };
    const customer = localCustomers.find(c => c.id === contract.customer_id);
    const slas = localSLAs.filter(s => s.contract_id === id);
    const incidents = localIncidents.filter(i => i.contract_id === id);
    return {
      data: {
        success: true,
        data: {
          ...contract,
          customer_name: customer?.name,
          company_name: customer?.company_name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          sla_commitments: slas,
          breach_incidents: incidents,
          activity_logs: [
            { id: genId(), action: 'created', user_name: 'Admin User', entity_name: contract.title, created_at: contract.created_at },
            { id: genId(), action: 'viewed', user_name: 'Admin User', entity_name: contract.title, created_at: now() },
          ],
        },
      },
    };
  },
  create: async (data) => {
    await delay(500);
    const customer = localCustomers.find(c => c.id === data.customer_id);
    const newContract = {
      id: genId(), contract_number: `CON-2024-${String(localContracts.length + 1).padStart(4, '0')}`,
      customer_name: customer?.name, company_name: customer?.company_name,
      created_by_name: 'Admin User', sla_count: '0', open_incidents: '0',
      created_at: now(), updated_at: now(), ...data,
    };
    localContracts = [newContract, ...localContracts];
    saveToStorage('bsx_mock_contracts', localContracts);
    return { data: { success: true, data: newContract, message: 'Contract created successfully.' } };
  },
  update: async (id, data) => {
    await delay(400);
    localContracts = localContracts.map(c => c.id === id ? { ...c, ...data, updated_at: now() } : c);
    saveToStorage('bsx_mock_contracts', localContracts);
    return { data: { success: true, data: localContracts.find(c => c.id === id) } };
  },
  delete: async (id) => {
    await delay(400);
    localContracts = localContracts.filter(c => c.id !== id);
    saveToStorage('bsx_mock_contracts', localContracts);
    return { data: { success: true, message: 'Contract deleted.' } };
  },
  archive: async (id) => {
    await delay(300);
    let newStatus = 'archived';
    let message = 'Contract archived successfully.';
    localContracts = localContracts.map(c => {
      if (c.id === id) {
        newStatus = c.status === 'archived' ? 'active' : 'archived';
        message = newStatus === 'archived' ? 'Contract archived successfully.' : 'Contract restored from archive successfully.';
        return { ...c, status: newStatus };
      }
      return c;
    });
    saveToStorage('bsx_mock_contracts', localContracts);
    return { data: { success: true, message, status: newStatus } };
  },
};

export const mockCustomersAPI = {
  getAll: async (params = {}) => {
    await delay(400);
    const filtered = filterArray(localCustomers, params);
    const result = paginate(filtered, params.page, params.limit || 15);
    return { data: { success: true, ...result } };
  },
  getById: async (id) => {
    await delay(300);
    const customer = localCustomers.find(c => c.id === id);
    if (!customer) throw { response: { data: { message: 'Customer not found.' } } };
    const contracts = localContracts.filter(c => c.customer_id === id);
    return { data: { success: true, data: { ...customer, contracts } } };
  },
  create: async (data) => {
    await delay(400);
    const newCustomer = {
      id: genId(), customer_number: `CUS-${String(localCustomers.length + 1).padStart(4, '0')}`,
      contract_count: '0', created_at: now(), ...data,
    };
    localCustomers = [newCustomer, ...localCustomers];
    saveToStorage('bsx_mock_customers', localCustomers);
    return { data: { success: true, data: newCustomer } };
  },
  update: async (id, data) => {
    await delay(400);
    localCustomers = localCustomers.map(c => c.id === id ? { ...c, ...data } : c);
    saveToStorage('bsx_mock_customers', localCustomers);
    return { data: { success: true, data: localCustomers.find(c => c.id === id) } };
  },
  delete: async (id) => {
    await delay(400);
    const contractCheck = localContracts.filter(c => c.customer_id === id);
    if (contractCheck.length > 0) throw { response: { data: { message: 'Cannot delete customer with existing contracts.' } } };
    localCustomers = localCustomers.filter(c => c.id !== id);
    saveToStorage('bsx_mock_customers', localCustomers);
    return { data: { success: true } };
  },
};

export const mockSLAAPI = {
  getAll: async (params = {}) => {
    await delay(400);
    let slas = localSLAs.map(s => {
      const contract = localContracts.find(c => c.id === s.contract_id);
      const customer = contract ? localCustomers.find(c => c.id === contract.customer_id) : null;
      return { ...s, contract_title: contract?.title, contract_number: contract?.contract_number, company_name: customer?.company_name };
    });
    if (params.status) slas = slas.filter(s => s.status === params.status);
    const result = paginate(slas, params.page, params.limit || 15);
    return { data: { success: true, ...result } };
  },
  getById: async (id) => {
    await delay(200);
    return { data: { success: true, data: localSLAs.find(s => s.id === id) } };
  },
  create: async (data) => {
    await delay(400);
    const contract = localContracts.find(c => c.id === data.contract_id);
    const customer = contract ? localCustomers.find(c => c.id === contract.customer_id) : null;
    const newSLA = { id: genId(), contract_title: contract?.title, contract_number: contract?.contract_number, company_name: customer?.company_name, created_at: now(), ...data };
    localSLAs = [newSLA, ...localSLAs];
    saveToStorage('bsx_mock_slas', localSLAs);
    return { data: { success: true, data: newSLA } };
  },
  update: async (id, data) => {
    await delay(400);
    localSLAs = localSLAs.map(s => s.id === id ? { ...s, ...data } : s);
    saveToStorage('bsx_mock_slas', localSLAs);
    return { data: { success: true, data: localSLAs.find(s => s.id === id) } };
  },
  delete: async (id) => {
    await delay(400);
    localSLAs = localSLAs.filter(s => s.id !== id);
    saveToStorage('bsx_mock_slas', localSLAs);
    return { data: { success: true } };
  },
};

export const mockIncidentsAPI = {
  getAll: async (params = {}) => {
    await delay(400);
    let incidents = localIncidents.map(i => {
      const contract = localContracts.find(c => c.id === i.contract_id);
      const customer = contract ? localCustomers.find(c => c.id === contract.customer_id) : null;
      return { ...i, contract_number: contract?.contract_number, company_name: customer?.company_name };
    });
    if (params.severity) incidents = incidents.filter(i => i.severity === params.severity);
    if (params.resolution_status) incidents = incidents.filter(i => i.resolution_status === params.resolution_status);
    const result = paginate(incidents, params.page, params.limit || 15);
    return { data: { success: true, ...result } };
  },
  getById: async (id) => {
    await delay(200);
    return { data: { success: true, data: localIncidents.find(i => i.id === id) } };
  },
  create: async (data) => {
    await delay(400);
    const contract = localContracts.find(c => c.id === data.contract_id);
    const customer = contract ? localCustomers.find(c => c.id === contract.customer_id) : null;
    const newInc = {
      id: genId(), incident_number: `INC-${String(localIncidents.length + 1).padStart(4, '0')}`,
      contract_number: contract?.contract_number, company_name: customer?.company_name,
      assigned_to_name: null, created_at: now(), ...data,
    };
    localIncidents = [newInc, ...localIncidents];
    saveToStorage('bsx_mock_incidents', localIncidents);
    return { data: { success: true, data: newInc } };
  },
  update: async (id, data) => {
    await delay(400);
    localIncidents = localIncidents.map(i => i.id === id ? { ...i, ...data } : i);
    saveToStorage('bsx_mock_incidents', localIncidents);
    return { data: { success: true, data: localIncidents.find(i => i.id === id) } };
  },
  close: async (id) => {
    await delay(300);
    localIncidents = localIncidents.map(i => i.id === id ? { ...i, resolution_status: 'closed', resolved_date: now() } : i);
    saveToStorage('bsx_mock_incidents', localIncidents);
    return { data: { success: true } };
  },
};

export const mockAlertsAPI = {
  getAll: async (params = {}) => {
    await delay(400);
    let alerts = localAlerts.map(a => {
      const contract = localContracts.find(c => c.id === a.contract_id);
      const customer = contract ? localCustomers.find(c => c.id === contract.customer_id) : null;
      return { ...a, contract_title: contract?.title, contract_number: contract?.contract_number, company_name: customer?.company_name };
    }).filter(a => !a.is_dismissed);
    if (params.is_read !== undefined) alerts = alerts.filter(a => a.is_read === (params.is_read === 'true' || params.is_read === true));
    if (params.severity) alerts = alerts.filter(a => a.severity === params.severity);
    const unread_count = localAlerts.filter(a => !a.is_read && !a.is_dismissed).length;
    return { data: { success: true, data: alerts, unread_count, pagination: { total: alerts.length, page: 1, limit: 100 } } };
  },
  markRead: async (id) => {
    await delay(100);
    localAlerts = localAlerts.map(a => a.id === id ? { ...a, is_read: true } : a);
    saveToStorage('bsx_mock_alerts', localAlerts);
    return { data: { success: true } };
  },
  markAllRead: async () => {
    await delay(200);
    localAlerts = localAlerts.map(a => ({ ...a, is_read: true }));
    saveToStorage('bsx_mock_alerts', localAlerts);
    return { data: { success: true } };
  },
  dismiss: async (id) => {
    await delay(200);
    localAlerts = localAlerts.map(a => a.id === id ? { ...a, is_dismissed: true } : a);
    saveToStorage('bsx_mock_alerts', localAlerts);
    return { data: { success: true } };
  },
};

export const mockReportsAPI = {
  getSummary: async () => {
    await delay(600);
    const totalValue = localContracts.reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
    return {
      data: {
        success: true,
        data: {
          summary: {
            total_contracts: localContracts.length,
            total_value: totalValue,
            avg_value: totalValue / localContracts.length,
            active_contracts: localContracts.filter(c => c.status === 'active').length,
            expired_contracts: localContracts.filter(c => c.status === 'expired').length,
          },
          contracts: localContracts.map(c => ({ ...c, company_name: localCustomers.find(cu => cu.id === c.customer_id)?.company_name })),
          sla: localSLAs.map(s => ({ ...s, contract_number: localContracts.find(c => c.id === s.contract_id)?.contract_number, company_name: localCustomers.find(cu => cu.id === localContracts.find(c => c.id === s.contract_id)?.customer_id)?.company_name })),
          incidents: localIncidents.map(i => ({ ...i, company_name: localCustomers.find(cu => cu.id === localContracts.find(c => c.id === i.contract_id)?.customer_id)?.company_name })),
          renewalForecast: localContracts.filter(c => c.renewal_date && new Date(c.renewal_date) >= new Date()).map(c => ({ ...c, company_name: localCustomers.find(cu => cu.id === c.customer_id)?.company_name, days_left: Math.ceil((new Date(c.renewal_date) - new Date()) / 86400000) })).sort((a, b) => a.days_left - b.days_left),
          customerSummary: localCustomers.map(cu => ({ ...cu, contract_count: localContracts.filter(c => c.customer_id === cu.id).length, active_contracts: localContracts.filter(c => c.customer_id === cu.id && c.status === 'active').length, total_value: localContracts.filter(c => c.customer_id === cu.id).reduce((s, c) => s + parseFloat(c.value || 0), 0) })),
        },
      },
    };
  },
};

export const mockUsersAPI = {
  getAll: async (params = {}) => {
    await delay(300);
    let users = [...localUsers];
    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return { data: { success: true, count: users.length, data: users } };
  },
  create: async (data) => {
    await delay(300);
    const newUser = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      working_on: data.working_on || '',
      employee_status: data.employee_status || 'Active',
      is_active: true,
      created_at: now(),
      updated_at: now()
    };
    localUsers.unshift(newUser);
    saveToStorage('bsx_mock_users', localUsers);
    return { data: { success: true, message: 'User created successfully.', data: newUser } };
  },
  update: async (id, data) => {
    await delay(300);
    localUsers = localUsers.map(u => u.id === id ? {
      ...u,
      name: data.name ?? u.name,
      email: data.email ?? u.email,
      role: data.role ?? u.role,
      working_on: data.working_on ?? u.working_on,
      employee_status: data.employee_status ?? u.employee_status,
      is_active: data.is_active ?? u.is_active,
      updated_at: now()
    } : u);
    saveToStorage('bsx_mock_users', localUsers);
    const updatedUser = localUsers.find(u => u.id === id);
    return { data: { success: true, message: 'User updated successfully.', data: updatedUser } };
  },
  delete: async (id) => {
    await delay(300);
    localUsers = localUsers.filter(u => u.id !== id);
    saveToStorage('bsx_mock_users', localUsers);
    return { data: { success: true, message: 'User deleted successfully.' } };
  }
};
