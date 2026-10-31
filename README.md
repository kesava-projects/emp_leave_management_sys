# Employee Leave Management System (LeaveSync)

A production-grade, full-stack Employee Leave Management System built with the **MERN** stack (MongoDB, Express, React 18, Node.js 20 ES Modules) and plain CSS.

---

## 🌟 Key Features

### 1. Role-Based Access Control (RBAC)
- **Employee**:
  - View real-time balances for all leave types (Annual, Sick, Casual, Unpaid).
  - Apply for leave with live working-day calculations (excludes weekends & public holidays) and inline date validation.
  - Support for half-day leaves (First Half / Morning or Second Half / Afternoon).
  - Cancel own pending leave requests (instantly restores reserved balance).
  - Visual status chips and leave history table.
- **Manager**:
  - All employee features.
  - Review queue for direct reports' leave requests.
  - One-click approval with automatic atomic balance deduction.
  - Rejection with mandatory decision comments.
  - Rule enforcement: Managers cannot approve their own requests (escalates to their manager or Admin).
  - Interactive Team Calendar (month grid, one row per person, pending requests displayed with striped patterns).
- **Admin / HR**:
  - Full employee management: create, edit, role assignment, reporting manager assignment, and deactivation.
  - Leave type configuration: yearly allowances, carry-over limits, colors, approval requirements, and paid/unpaid status.
  - Public holiday calendar management (dates automatically excluded from working-day counts).
  - Cancel approved requests when necessary (automatically restores used balances).
  - High-level analytics: total requests, approved days taken, pending requests, breakdowns by department and category.
  - 1-click CSV Export (`/api/reports/export.csv`) for payroll & compliance.

### 2. Business Rules & Concurrency Engine
- **Working Days Calculation**: Automatically filters out Saturdays, Sundays, and official public holidays.
- **Atomic Balance Updates**: Uses atomic conditional updates (`LeaveBalance.findOneAndUpdate` with filter checks) preventing double approvals or overdrawing balances under concurrent requests.
- **Overlap Detection**: Disallows any overlapping requests with pending or approved leaves for the same employee, while intelligently permitting complementary half-days (first half + second half on the same date).
- **Audit Logging**: Every transition (`created`, `approved`, `rejected`, `cancelled`) is recorded in an `AuditLog` collection with actor ID and timestamp.
- **Security**:
  - JWT stored in `httpOnly`, `sameSite`, and secure cookies.
  - Passwords hashed using bcrypt.
  - Strict input validation using Zod on every API endpoint.
  - Security headers via Helmet, CORS restricted to client origin, and rate limiting on login attempts.
  - Dark mode support using `prefers-color-scheme`.

---

## 🏗️ Architecture & Project Structure

```
/
├── .env.example                     # Root environment configuration
├── package.json                     # Root scripts (concurrently dev, seed, test)
├── README.md
├── server/                          # Express + Node 20 (ES Modules)
│   ├── .env.example
│   ├── src/
│   │   ├── config/                  # DB connection and env loader
│   │   ├── controllers/             # Auth, Balance, Leave, Manager, Calendar, Admin, Report
│   │   ├── middlewares/             # requireAuth, requireRole, validate (Zod), rateLimiter, errorHandler
│   │   ├── models/                  # User, LeaveType, LeaveBalance, LeaveRequest, Holiday, AuditLog
│   │   ├── routes/                  # Modular Express routers
│   │   ├── scripts/                 # seed.js and resetDb.js
│   │   ├── services/                # workingDays, balance, leaveRequest business logic
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entry point
│   └── tests/                       # Jest + Supertest + mongodb-memory-server
│       ├── setup.js
│       ├── unit/                    # workingDays, overlap, balance unit tests
│       └── integration/             # auth, leaveRequest, permissions integration tests
└── client/                          # React 18 + Vite (Plain CSS)
    ├── .env.example
    ├── src/
    │   ├── api/                     # Fetch API client
    │   ├── components/              # Navbar, Modal, StatusChip, ProtectedRoute
    │   ├── context/                 # AuthContext (cookie auth), ToastContext
    │   ├── pages/                   # Login, EmployeeDashboard, ManagerDashboard, Calendar, Admin pages
    │   ├── styles/                  # Responsive CSS with dark mode variables
    │   ├── tests/                   # Vitest + React Testing Library component tests
    │   ├── App.jsx
    │   └── main.jsx
    └── vite.config.js
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ (tested on v26)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI.

### 2. Start MongoDB
If using local MongoDB on macOS:
```bash
brew services start mongodb-community
# or start standalone:
mongod --dbpath /path/to/data/db
```

### 3. Installation
Install all dependencies (root, server, and client):
```bash
npm install
npm run install:all # or cd server && npm install && cd ../client && npm install
```

### 4. Environment Variables
Copy `.env.example` to `.env` in the root or `server/`:
```bash
cp server/.env.example server/.env
```

Default values in `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/leave_management
JWT_SECRET=super_secret_jwt_key_leave_management_dev_12345
CLIENT_URL=http://localhost:5173
```

### 5. Seed the Database
Seed 1 Admin, 2 Managers, 6 Employees, leave types, balances, public holidays, and sample leave requests:
```bash
npm run seed
```
To wipe and re-seed from scratch at any time:
```bash
npm run reset-db
```

### 6. Run the Application
Start both the backend server (port 5000) and frontend client (port 5173) concurrently:
```bash
npm run dev
```

Visit the application in your browser at: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Demo Logins

All demo accounts use password: `Password123!`

| Role | Name | Email | Department | Managed By |
|------|------|-------|------------|------------|
| **Admin** | Alice Admin | `admin@company.com` | Human Resources | *None* |
| **Manager** | Bob Manager | `bob.manager@company.com` | Engineering | Alice Admin |
| **Manager** | Carol Manager | `carol.manager@company.com` | Product & Design | Alice Admin |
| **Employee** | David Dev | `david.dev@company.com` | Engineering | Bob Manager |
| **Employee** | Emma Engineer | `emma.engineer@company.com` | Engineering | Bob Manager |
| **Employee** | Frank Frontend | `frank.frontend@company.com` | Engineering | Bob Manager |
| **Employee** | Grace Growth | `grace.growth@company.com` | Product & Design | Carol Manager |
| **Employee** | Henry Hero | `henry.hero@company.com` | Product & Design | Carol Manager |
| **Employee** | Ivy Intern | `ivy.intern@company.com` | Product & Design | Carol Manager |

*(Quick-login buttons are also available on the Login screen for instant one-click login).*

---

## ☁️ Deploy to Vercel

The project is fully prepared for zero-configuration deployment to **Vercel** with the frontend static build and the backend running as serverless functions.

### 1. Project Configuration Files Included
- `vercel.json`: Configures client build (`npm run build --prefix client`), static output (`client/dist`), and serverless routing (`/api/*` -> `api/index.js`).
- `api/index.js`: Serverless handler with MongoDB connection pooling and caching.
- `.vercelignore`: Excludes tests, git, and log files.

### 2. Required Environment Variables on Vercel
In your Vercel Project Settings > **Environment Variables**, set:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster0.mongodb.net/leave_management?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secure Secret for signing JWTs | `a_long_random_secure_secret_key_here` |
| `NODE_ENV` | Environment | `production` |

### 3. Deploy Methods

#### Option A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Keep default settings (`vercel.json` handles the build and routes automatically).
4. Add the `MONGO_URI` and `JWT_SECRET` environment variables.
5. Click **Deploy**.

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. Seed Production Database (Atlas)
To seed initial employees and leave types in your production MongoDB Atlas database:
```bash
MONGO_URI="mongodb+srv://user:pass@cluster0.mongodb.net/leave_management" npm run seed
```

---

## 🧪 Running Tests

The test suite includes 44 backend tests (unit + integration with in-memory MongoDB) and 9 frontend tests (Vitest + React Testing Library).

Run all tests across backend and frontend:
```bash
npm test
```

Run backend tests only:
```bash
npm run test:server
```

Run frontend tests only:
```bash
npm run test:client
```

Run ESLint:
```bash
npm run lint
```

---

## 📡 API Reference Summary

All responses follow standard HTTP codes and error format:
`{ "error": { "code": "ERROR_CODE", "message": "Human readable error description" } }`

### Authentication
- `POST /api/auth/login` - Authenticate, sets httpOnly cookie `token` (Rate limited)
- `POST /api/auth/logout` - Clear auth cookie
- `GET /api/auth/me` - Get authenticated user profile

### Leave Balances
- `GET /api/balances/me?year=YYYY` - Get own balances and remaining days

### Leave Requests
- `GET /api/requests` - Get own leave requests history
- `GET /api/requests/calculate-days?startDate=...&endDate=...&halfDay=...` - Calculate working days excluding holidays
- `POST /api/requests` - Apply for leave (validates overlap, past date, balance)
- `PATCH /api/requests/:id/cancel` - Cancel request (Employee can cancel pending; Admin can cancel approved)

### Manager Actions
- `GET /api/manager/requests` - Get direct reports' requests
- `PATCH /api/requests/:id/approve` - Approve request (atomic balance deduction)
- `PATCH /api/requests/:id/reject` - Reject request (requires comment)

### Team Calendar
- `GET /api/calendar?month=YYYY-MM` - Month schedule (team members, approved/pending leaves, holidays)

### Admin Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user / change manager / deactivate
- `GET /api/leave-types` - List leave types
- `POST /api/leave-types` - Create leave type
- `PATCH /api/leave-types/:id` - Update leave type
- `GET /api/holidays` - List public holidays
- `POST /api/holidays` - Add holiday
- `DELETE /api/holidays/:id` - Delete holiday

### Reports & Export
- `GET /api/reports/summary?year=YYYY&department=...` - Aggregate status & category summary
- `GET /api/reports/export.csv` - Stream/download CSV report of leave requests
