# Sales & Marketing Management — Full Project

A complete MERN-stack application: Admin imports Excel data, assigns records to
employees, and employees work the records through a custom React UI. Employees
never see the Excel file — only application records.

## Structure

```
sales-marketing-management/
├── backend/     Node + Express + MongoDB (Mongoose) + JWT auth
└── frontend/    React + Vite + Tailwind + React Router + Axios
```

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — generate one with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `ADMIN_EMPLOYEE_ID`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — used once by the seed script

Create the first admin (and optionally a demo employee `EMP001` / `Employee@123`):

```bash
npm run seed:admin -- --demo
```

Start the API:

```bash
npm run dev
```

Expected: `MongoDB connected: ...` then `Server running on port 5000`.

Health check: `GET http://localhost:5000/api/health` → `{"success":true,...}`

## 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## 3. Log In

- **Admin:** the Employee ID / password you set in `backend/.env`
- **Demo employee** (if seeded with `--demo`): `EMP001` / `Employee@123`

## 4. Typical Flow

1. Log in as admin → **Employees** → create real employee accounts.
2. **Import Excel** → upload a `.xlsx`/`.xls` file (columns: any names — you'll map them) → map columns to `customerName` (required), `phone` (required), `email`, `company`, `city`, `product` → review the preview → **Import**.
3. **Records** → search/filter, select rows (or use **Assignments → Bulk Assign by Filter**) → assign to an employee.
4. Log out, log in as that employee → **My Records** → open a record → update status, add a comment, set a follow-up date → **Save**.
5. Back in the admin **Records** page, open the same record to see the comment and activity history; check **Admin Dashboard** for live stats and employee performance.

## Security Notes

- Every route is protected by JWT (`protect` middleware) and role-checked server-side (`authorize` middleware) — the frontend route guards are for UX only, not the real boundary.
- An employee's `assignedTo` identity always comes from the authenticated JWT/database user, never from the request — so `EMP001` cannot fetch `EMP002`'s records by editing a URL or request body.
- Passwords are hashed with bcrypt (cost factor 12) and never returned in any API response.
- Login is rate-limited (10 failed attempts / 15 min / IP) and uses a constant-time-ish comparison to avoid leaking which Employee IDs exist.

## What's Included (all 12 modules)

| Module | Where |
|---|---|
| 1. Project setup | both folders, README |
| 2. Auth (JWT, roles, bcrypt) | `backend/controllers/authController.js`, `middleware/` |
| 3. Admin dashboard | `frontend/src/pages/admin/AdminDashboard.jsx` |
| 4. Employee management | `employeeController.js`, `pages/admin/Employees.jsx` |
| 5. Excel import + mapping | `importController.js`, `pages/admin/ImportExcel.jsx` |
| 6. Record management | `recordController.js`, `pages/admin/Records.jsx` |
| 7. Assignment system | `assignmentController.js`, `pages/admin/Assignments.jsx` |
| 8. Employee dashboard | `pages/employee/EmployeeDashboard.jsx` |
| 9. Employee work system | `employeeRecordController.js`, `pages/employee/RecordDetail.jsx` |
| 10. Activity history | `activityController.js`, shown on both record detail pages |
| 11. Reports (performance chart) | bar chart on Admin Dashboard (recharts) |
| 12. Security & error handling | `errorMiddleware.js`, rate limiting, input validation throughout |

## Known Simplifications (flag these if you need more)

- The Excel "confirm import" step sends parsed rows back to the server as JSON rather than re-uploading the file — simpler, but means very large files (tens of thousands of rows) should be chunked; ask if you want that added.
- Reports are folded into the Admin Dashboard (status breakdown + performance chart) rather than a separate page — easy to split out if you want a dedicated Reports section with more chart types.
- No pagination on the Excel preview table (shows first 10 rows only, by design).
- Deployment/production config (Module 12's last piece) isn't included — say the word if you want a Dockerfile / PM2 config / build-and-serve setup.










ongoDB connected: ac-j65ijbv-shard-00-01.prckqlo.mongodb.net
✔ Created admin: ADMIN001 (admin@example.com)
password- Admin@12345
✔ Created employee: EMP001 (rahul@example.com)
  (Demo employee password: Employee@123 - for testing only)