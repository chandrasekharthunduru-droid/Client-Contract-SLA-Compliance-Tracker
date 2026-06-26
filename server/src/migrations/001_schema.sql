-- ============================================================
-- BrandSparkX: Client Contract & SLA Compliance Tracker
-- PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  working_on TEXT,
  employee_status VARCHAR(50) DEFAULT 'Active' CHECK (employee_status IN ('Active', 'On Leave', 'Inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_number VARCHAR(20) UNIQUE,
  name VARCHAR(150) NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  address TEXT,
  industry VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CONTRACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(30) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  title VARCHAR(300) NOT NULL,
  contract_type VARCHAR(50) DEFAULT 'Service Agreement' CHECK (contract_type IN (
    'Service Agreement', 'Maintenance Contract', 'SLA Contract',
    'NDA', 'Partnership Agreement', 'Licensing Agreement', 'Consulting Agreement', 'Other'
  )),
  value NUMERIC(15, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  deliverable_timeline TEXT,
  sla_commitment TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'renewed', 'archived')),
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date > start_date),
  CONSTRAINT renewal_after_start CHECK (renewal_date IS NULL OR renewal_date >= start_date)
);

-- ============================================================
-- SLA COMMITMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  sla_name VARCHAR(200) NOT NULL,
  target_response_time VARCHAR(100),
  target_resolution_time VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'breached', 'at_risk')),
  compliance_pct NUMERIC(5, 2) DEFAULT 100.00 CHECK (compliance_pct >= 0 AND compliance_pct <= 100),
  last_review_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BREACH INCIDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS breach_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number VARCHAR(20) UNIQUE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  root_cause TEXT,
  resolution_status VARCHAR(30) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_date DATE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'renewal_warning', 'renewal_critical', 'contract_expired',
    'sla_breach', 'sla_at_risk', 'incident_created', 'general'
  )),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'contract', 'customer', 'sla_commitment', 'breach_incident', 'alert', 'user'
  )),
  entity_id UUID,
  entity_name VARCHAR(300),
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed', 'archived', 'exported', 'login', 'logout')),
  changes JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_renewal_date ON contracts(renewal_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_sla_contract_id ON sla_commitments(contract_id);
CREATE INDEX IF NOT EXISTS idx_incidents_contract_id ON breach_incidents(contract_id);
CREATE INDEX IF NOT EXISTS idx_alerts_contract_id ON alerts(contract_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sla_updated_at ON sla_commitments;
CREATE TRIGGER update_sla_updated_at BEFORE UPDATE ON sla_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON breach_incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
