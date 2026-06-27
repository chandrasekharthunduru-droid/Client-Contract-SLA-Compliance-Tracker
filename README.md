# BrandSparkX — Client Contract & SLA Compliance Tracker

BrandSparkX is a Contract & SLA (Service Level Agreement) Compliance Tracker. It provides a complete dashboard for tracking client contracts, SLA commitments, breach incidents, alerts, and detailed reports.

---

## 🚀 Key Features in the Present Project

### 👥 1. Staff Management (Admin Only)
* **Staff Details Dashboard**: Accessible exclusively by the Admin role (`admin@brandsparkx.com`) via the **Staff Details** link in the navigation sidebar.
* **Full CRUD Operations**: Admins can view all employees, create new profiles, edit active tasks, adjust login permissions, update work status, and delete records (blocking self-deletion).
* **Work Tracker**: Displays active tasks (`working_on`) and employee statuses (Active, On Leave, Inactive) dynamically.

### 🔒 2. Live Password Strength Enforcer
* **Real-time Evaluation**: Measures password strength dynamically as you type based on character length (minimum 8 characters), uppercase, lowercase, numbers, and special symbols.
* **Visual Indicator Badges**: Displays a color-coded warning badge directly below input fields:
  * **Weak** (Red)
  * **Medium** (Orange)
  * **Strong** (Green)
* **Strict Submission Locks**: Frontend validation blocks saving any profile with a `"Weak"` password. Backend controllers double-check password integrity, returning a `400` status for weak hashes to ensure strict security.

### 📂 3. Contract Archive Toggle & Button Styling
* **Status Toggling**: The archive icon on rows in the Contracts dashboard acts as a toggle. 
  * Clicking it on active/draft contracts sets their status to `'archived'` and toasts a success confirmation.
  * Clicking it again on archived contracts restores them back to `'active'`, showing a restoration toast.
* **Dynamic Button Color Indicators**: Only the Archive button changes state:
  * If a contract is archived, the button turns a distinct **black** color (`bg-[#0F1E3C] text-white`) with high-contrast elements.
  * If unarchived/active, the button reverts back to a **default transparent/gray** color, while the rest of the row remains white.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Recharts, React Router DOM, Framer Motion, React Hot Toast
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (Supabase Host connected via Supavisor Pooler for IPv4 compatibility)
* **Authentication**: JSON Web Token (JWT) + bcryptjs hashes
* **PDF Export**: jsPDF + autoTable

---

## 📦 Quick Start & Environment Configuration

### Prerequisites
* **Node.js 18+**
* **Supabase Database** (Connection pooler on port 5432)

### 1. Backend Setup & Connection
Navigate to the `server` directory and view/edit your `.env` file:
```bash
cd server
```

The `.env` contains the following parameters:
* **Host**: `aws-1-ap-northeast-1.pooler.supabase.com`
* **Port**: `5432` (Session Mode, required for migrations and seeds)
* **Database**: `postgres`
* **Username**: `postgres.bdjsdwzeverouefwihns`
* **Password**: `Brandsparx@123` (properly URL-encoded in the connection string)

Install dependencies, run database setups, and start the nodemon dev server:
```bash
npm install
npm run migrate       # Creates all Postgres database tables
npm run seed          # Seeds mock demo data and employee profiles
npm run dev           # Starts backend server on http://localhost:5000
```

### 2. Frontend Setup
Navigate to the `client` directory, install packages, and run the Vite dev server:
```bash
cd client
```
npm install
npm run dev           # Starts frontend client on http://localhost:5173
```

---

## 👥 Demo Login Credentials

Upon running `npm run seed`, the database is populated with the following roles:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@brandsparkx.com` | `Password123!` |
| **Manager** | `manager@brandsparkx.com` | `Password123!` |
| **Staff** | `staff@brandsparkx.com` | `Password123!` |

### Permissions Grid

| Action | Admin | Manager | Staff |
|---|:---:|:---:|:---:|
| View dashboard & records | ✅ | ✅ | ✅ |
| Create & Edit records | ✅ | ✅ | ❌ |
| Delete records | ✅ | ❌ | ❌ |
| Archive & Toggle contracts | ✅ | ✅ | ❌ |
| View & Manage Staff Details | ✅ | ❌ | ❌ |
| Export SLA compliance reports | ✅ | ✅ | ✅ |

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| **POST** | `/api/auth/login` | Login and retrieve session JWT |
| **POST** | `/api/auth/logout` | Terminate session and log activity |
| **GET** | `/api/auth/me` | Retrieve authenticated user profile |
| **GET / POST** | `/api/users` | [Admin] List all users / Add new user (enforces strong password) |
| **PUT / DELETE**| `/api/users/:id` | [Admin] Edit user details / Delete employee profile |
| **GET / POST** | `/api/contracts` | List all contracts / Create new contract |
| **GET / PUT / DELETE**| `/api/contracts/:id` | Read details / Update values / Delete contract |
| **PUT** | `/api/contracts/:id/archive` | Toggle archive status (active ↔ archived) |
| **GET / POST** | `/api/customers` | List all customer profiles / Create client profile |
| **GET / POST** | `/api/sla` | List SLA commitments / Create SLA target |
| **GET / POST** | `/api/incidents` | List breach incidents / Log new incident |
| **PUT** | `/api/incidents/:id/close` | Update incident status to Closed |
| **GET** | `/api/alerts` | Fetch recent notifications |
| **PUT** | `/api/alerts/read-all` | Mark all notifications as read |
| **GET** | `/api/reports/summary` | Generate SLA compliance analytics reports |
