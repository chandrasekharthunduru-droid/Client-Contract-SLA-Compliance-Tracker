/**
 * BrandSparkX - Database Seed Script
 * Generates: 3 users, 20 customers, 50 contracts, 100 SLA records, 25 incidents, 30 alerts
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const INDIAN_INDUSTRIES = [
  'Information Technology', 'Banking & Finance', 'Healthcare', 'Manufacturing',
  'Retail & E-Commerce', 'Telecom', 'Education', 'Pharmaceuticals',
  'Real Estate', 'Logistics & Supply Chain', 'Energy', 'Media & Entertainment',
  'FMCG', 'Automotive', 'Insurance',
];

const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Surat', 'Jaipur'];

const CONTRACT_TYPES = ['Service Agreement', 'Maintenance Contract', 'SLA Contract', 'NDA', 'Partnership Agreement', 'Consulting Agreement'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CONTRACT_STATUSES = ['draft', 'active', 'active', 'active', 'expired', 'renewed', 'archived'];
const INCIDENT_TYPES = ['Service Downtime', 'SLA Breach', 'Deliverable Delay', 'Quality Issue', 'Communication Gap', 'Data Security Breach', 'Payment Dispute'];
const SLA_NAMES = ['24x7 Support', 'Critical Response', 'Business Hours Support', 'Priority Escalation', 'Data Backup SLA', 'Uptime Guarantee', 'Incident Response Time', 'Change Management SLA'];

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Starting seed process...');

  try {
    await client.query('BEGIN');

    // ── Clear existing data ──────────────────────────────────────
    console.log('🗑️  Clearing existing data...');
    await client.query('DELETE FROM activity_logs');
    await client.query('DELETE FROM alerts');
    await client.query('DELETE FROM breach_incidents');
    await client.query('DELETE FROM sla_commitments');
    await client.query('DELETE FROM contracts');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM users');

    // ── Create Users ─────────────────────────────────────────────
    console.log('👥 Creating users...');
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const userRows = await client.query(
      `INSERT INTO users (name, email, password_hash, role, working_on, employee_status) VALUES
       ('Admin User', 'admin@brandsparkx.com', $1, 'admin', 'System Administration & Security', 'Active'),
       ('Priya Sharma', 'manager@brandsparkx.com', $1, 'manager', 'SLA Escalations & Contract Signoff', 'Active'),
       ('Ravi Kumar', 'staff@brandsparkx.com', $1, 'staff', 'Reviewing SLA breach incidents & alerts', 'Active')
       RETURNING id, role`,
      [passwordHash]
    );
    const users = userRows.rows;
    const adminId = users[0].id;
    const managerId = users[1].id;

    // ── Create Customers ─────────────────────────────────────────
    console.log('🏢 Creating 20 customers...');
    const customerIds = [];
    for (let i = 0; i < 20; i++) {
      const companyName = faker.company.name();
      const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
      const result = await client.query(
        `INSERT INTO customers (customer_number, name, company_name, email, phone, address, industry, country, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          `CUS-${String(i + 1).padStart(4, '0')}`,
          faker.person.fullName(),
          companyName,
          faker.internet.email({ provider: companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com' }),
          `+91-${faker.string.numeric(10)}`,
          `${faker.location.streetAddress()}, ${city}, India`,
          INDIAN_INDUSTRIES[Math.floor(Math.random() * INDIAN_INDUSTRIES.length)],
          'India',
          Math.random() > 0.15 ? 'active' : 'inactive',
          Math.random() > 0.5 ? adminId : managerId,
        ]
      );
      customerIds.push(result.rows[0].id);
    }

    // ── Create Contracts ─────────────────────────────────────────
    console.log('📄 Creating 50 contracts...');
    const contractIds = [];
    const contractValues = [];
    for (let i = 0; i < 50; i++) {
      const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
      const startDate = faker.date.between({ from: '2023-01-01', to: '2025-06-01' });
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + faker.number.int({ min: 1, max: 3 }));
      const renewalDate = new Date(endDate);
      renewalDate.setDate(renewalDate.getDate() - faker.number.int({ min: 5, max: 60 }));

      // Some contracts expire soon to demo alerts
      const makeExpiringSoon = i < 5;
      const makeExpired = i >= 5 && i < 10;

      let adjustedEndDate = endDate;
      let adjustedRenewalDate = renewalDate;
      let status;

      if (makeExpiringSoon) {
        adjustedRenewalDate = new Date();
        adjustedRenewalDate.setDate(adjustedRenewalDate.getDate() + faker.number.int({ min: 2, max: 25 }));
        adjustedEndDate = new Date(adjustedRenewalDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 30);
        status = 'active';
      } else if (makeExpired) {
        adjustedEndDate = new Date();
        adjustedEndDate.setDate(adjustedEndDate.getDate() - faker.number.int({ min: 1, max: 30 }));
        adjustedRenewalDate = new Date(adjustedEndDate);
        adjustedRenewalDate.setDate(adjustedRenewalDate.getDate() - 10);
        status = 'expired';
      } else {
        const statusArr = CONTRACT_STATUSES;
        status = statusArr[Math.floor(Math.random() * statusArr.length)];
      }

      const value = faker.number.int({ min: 50000, max: 5000000 });
      const result = await client.query(
        `INSERT INTO contracts (
          contract_number, customer_id, title, contract_type, value, start_date, end_date,
          renewal_date, deliverable_timeline, sla_commitment, priority, status, description, created_by, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14) RETURNING id`,
        [
          `CON-2024-${String(i + 1).padStart(4, '0')}`,
          customerId,
          `${faker.commerce.productAdjective()} ${CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)]} - ${faker.company.buzzNoun()}`,
          CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)],
          value,
          startDate.toISOString().split('T')[0],
          adjustedEndDate.toISOString().split('T')[0],
          adjustedRenewalDate.toISOString().split('T')[0],
          `${faker.number.int({ min: 30, max: 180 })} days from contract start`,
          `${faker.number.int({ min: 1, max: 24 })} hour response time; ${faker.number.int({ min: 24, max: 72 })} hour resolution`,
          PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
          status,
          faker.lorem.sentences(2),
          Math.random() > 0.5 ? adminId : managerId,
        ]
      );
      contractIds.push(result.rows[0].id);
      contractValues.push(value);
    }

    // ── Create SLA Commitments ───────────────────────────────────
    console.log('📋 Creating 100 SLA commitments...');
    for (let i = 0; i < 100; i++) {
      const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
      const compliance = faker.number.float({ min: 65, max: 100, fractionDigits: 1 });
      const status = compliance < 80 ? 'breached' : compliance < 90 ? 'at_risk' : 'active';
      const lastReview = faker.date.between({ from: '2024-01-01', to: '2025-05-30' });

      await client.query(
        `INSERT INTO sla_commitments (contract_id, sla_name, target_response_time, target_resolution_time, status, compliance_pct, last_review_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          contractId,
          SLA_NAMES[Math.floor(Math.random() * SLA_NAMES.length)],
          `${faker.number.int({ min: 1, max: 24 })} hours`,
          `${faker.number.int({ min: 4, max: 72 })} hours`,
          status,
          compliance,
          lastReview.toISOString().split('T')[0],
        ]
      );
    }

    // ── Create Breach Incidents ──────────────────────────────────
    console.log('🔥 Creating 25 breach incidents...');
    const incidentStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const severities = ['low', 'medium', 'high', 'critical'];
    for (let i = 0; i < 25; i++) {
      const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
      const incidentDate = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const resStatus = incidentStatuses[Math.floor(Math.random() * incidentStatuses.length)];
      const resolvedDate = resStatus === 'resolved' || resStatus === 'closed'
        ? new Date(new Date(incidentDate).setDate(incidentDate.getDate() + faker.number.int({ min: 1, max: 14 }))).toISOString().split('T')[0]
        : null;

      await client.query(
        `INSERT INTO breach_incidents (
          incident_number, contract_id, incident_date, incident_type, severity, description,
          root_cause, resolution_status, resolved_date, assigned_to, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          `INC-${String(i + 1).padStart(4, '0')}`,
          contractId,
          incidentDate.toISOString().split('T')[0],
          INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)],
          severity,
          faker.lorem.sentences(2),
          faker.lorem.sentence(),
          resStatus,
          resolvedDate,
          Math.random() > 0.5 ? adminId : managerId,
          adminId,
        ]
      );
    }

    // ── Create Alerts ────────────────────────────────────────────
    console.log('🔔 Creating 30 alerts...');
    const alertTypes = ['renewal_warning', 'renewal_critical', 'contract_expired', 'sla_breach', 'sla_at_risk', 'incident_created'];
    for (let i = 0; i < 30; i++) {
      const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = ['medium', 'high', 'critical'][Math.floor(Math.random() * 3)];
      await client.query(
        `INSERT INTO alerts (contract_id, alert_type, severity, title, message, is_read)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          contractId,
          alertType,
          severity,
          `${alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Action Required`,
          faker.lorem.sentences(1),
          Math.random() > 0.6,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`
✅ Seed completed successfully!
   👥 3 Users created
   🏢 20 Customers created  
   📄 50 Contracts created
   📋 100 SLA Commitments created
   🔥 25 Breach Incidents created
   🔔 30 Alerts created

🔐 Login Credentials:
   Admin:   admin@brandsparkx.com   / Password123!
   Manager: manager@brandsparkx.com / Password123!
   Staff:   staff@brandsparkx.com   / Password123!
    `);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
