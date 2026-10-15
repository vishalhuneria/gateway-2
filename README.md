# GateWay — MERN campus visitor management

This project converts Anwesha's React/Vite GateWay interface into a full-stack MERN app. It keeps the resident registration form, campus visitor pass/QR preview, admin clearance desk, document inspection, guard terminal, optical QR scanning, blacklist checks, overstay indicator, and CSV export, while moving persistence and security decisions to Express + MongoDB.

## Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios, Lucide React, `qrcode.react`, `html5-qrcode`
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Security:** bcrypt password hashing, signed JWT access tokens, role-based middleware, login rate limiting, Helmet, CORS allow-list, protected document routes, request validation and audit records

## Features connected to the backend

- Student and faculty registration with email/password; public registration cannot create admin or guard accounts.
- JWT login, session restore (`/api/auth/me`), logout, and server-side role checks.
- Persistent visitor requests with visitor/host information and JPG/JPEG/PDF identity uploads.
- Unique request IDs and 4-digit passcodes. QR values contain the passcode; the backend looks it up and makes the access decision.
- Admin approval/rejection with rejection reason, blacklist/unblacklist actions, summary metrics, and protected document inspection.
- Guard verification checks approval status, blacklist state, and visit date window before check-in/check-out. Gate events and other meaningful actions are audit logged.
- Guard searches visitor records, scans QR through the device camera, shows visit status, exports visitor/gate records as CSV, and shows overdue stays only after the authorised exit date has passed.

## Prerequisites

- Node.js 22 LTS recommended (Node 20.19+ should work with the included Vite toolchain)
- npm
- MongoDB locally, or a MongoDB Atlas database/network access rule

## Run locally (Windows PowerShell)

Run these commands from the project root (`GateWay-MERN-Anwesha`):

```powershell
Copy-Item server/.env.example server/.env
npm install
```

Open `server/.env` and configure:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/gateway
JWT_SECRET=replace-this-with-a-random-secret-at-least-32-characters-long
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
BOOTSTRAP_ADMIN_EMAIL=admin@iitrpr.ac.in
BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-unique-strong-admin-password-at-least-12-characters
BOOTSTRAP_GUARD_EMAIL=guard@iitrpr.ac.in
BOOTSTRAP_GUARD_PASSWORD=replace-with-a-unique-strong-guard-password-at-least-12-characters
```

Replace all sample bootstrap passwords and the JWT secret. Do not commit `server/.env`. For Atlas, replace `MONGODB_URI` with your Atlas connection string and allow network access for your development machine.

Create the first admin and guard accounts from your configured environment, then start the app:

```powershell
npm run seed
npm run dev
```

Open **http://localhost:5173**. The API health endpoint is **http://localhost:5000/api/health**. The local Vite server proxies `/api` requests to port 5000.

The seed script creates or resets the configured admin/guard accounts. Re-running it resets those accounts to the configured passwords, so keep the environment file private.

## First-use flow

1. Register a student account using an approved institutional domain (`@iitrpr.ac.in` or `@campus.edu`) and a password of at least 8 characters.
2. Sign in and submit a visitor request. Both visitor and host ID documents (JPG/JPEG/PDF, up to 5 MB per file by default) must be uploaded.
3. Sign out and log in as the seeded admin. Review the request and documents, then approve or reject it.
4. Sign in as guard. Scan the QR/passcode or find the visitor and record check-in/check-out.
5. Review the guard status table and use **Download CSV** to export visible visitor data.

## Environment variables

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required in practice) |
| `JWT_SECRET` | Random signing secret, at least 32 characters; never use the sample value in production |
| `JWT_EXPIRES_IN` | JWT duration, e.g. `8h` |
| `CLIENT_ORIGIN` | Comma-separated exact frontend origins allowed by CORS; don't add a path or trailing slash |
| `PORT` | Backend port, defaults to 5000 |
| `UPLOAD_DIR` | Local document upload folder, defaults to `server/uploads` |
| `MAX_FILE_SIZE_MB` | Per-file upload size limit |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD` | Initial admin seed credentials |
| `BOOTSTRAP_GUARD_EMAIL/PASSWORD` | Initial guard seed credentials |
| `VITE_API_URL` | Frontend API base; local default `/api`; for separately hosted frontend use `https://your-backend-host/api` |

## Deployment notes

- **Backend (Render):** set `MONGODB_URI`, a fresh strong `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_ORIGIN` (the exact deployed frontend origin), and the bootstrap values as environment variables. Build command: `npm install`; start command: `npm start`. Run the seed command once to create the initial admin/guard users.
- **Frontend (Vercel):** set `VITE_API_URL` to the backend base URL ending in `/api`, e.g. `https://your-service.onrender.com/api`, then redeploy. Do not include `VITE_API_URL=` inside the value.
- Keep `CLIENT_ORIGIN` as a comma-separated list if both production and a specific preview origin need access.
- The current upload adapter stores documents on local disk. Many ephemeral hosting filesystems do not guarantee uploads survive redeploy/restart; use a persistent disk or object storage before relying on uploaded IDs in production.
- JWT logout clears the token on the current browser but does not revoke a copied token server-side before expiry. This is acceptable for a student MVP; use short token lifetimes and a revocation/session store for stronger production logout semantics.
- Aadhaar values are not persisted in clear text, but passport numbers are still stored in the current prototype. Before production, implement field-level encryption, retention rules, access policy and a lawful data-handling process for government ID data.
- The UI's “Simulate Email” action is intentionally a demo-only simulation; no email service is configured.

## API route map

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check |
| `POST` | `/api/auth/register` | Public | Student/faculty registration |
| `POST` | `/api/auth/login` | Public, rate limited | Login and JWT issue |
| `GET` | `/api/auth/me` | Signed in | Resolve current account |
| `POST` | `/api/auth/logout` | Signed in | Record logout; client discards token |
| `GET` | `/api/requests` | Resident sees own; admin/guard see all | Search/list requests |
| `POST` | `/api/requests` | Student/faculty | Submit visitor request + documents |
| `GET` | `/api/requests/stats` | Admin/guard | Dashboard metrics |
| `PATCH` | `/api/requests/:id/decision` | Admin | Approve/reject |
| `PATCH` | `/api/requests/:id/blacklist` | Admin | Block/unblock visitor |
| `GET` | `/api/requests/:id/documents/:kind` | Admin | Protected ID document stream |
| `POST` | `/api/gate/verify` | Guard/admin | Verify QR/passcode and visit window |
| `POST` | `/api/gate/:id/transition` | Guard/admin | Check-in/check-out with state validation |
| `GET` | `/api/gate/history` | Guard/admin | Recent gate activity history |
| `GET` | `/api/audit` | Admin | Audit event records |

## Project structure

```text
GateWay-MERN-Anwesha/
├── client/                 # React/Vite UI
│   └── src/
│       ├── components/
│       │   ├── LoginModal.jsx
│       │   ├── ResidentPortal.jsx
│       │   ├── AdminDesk.jsx
│       │   ├── GuardTerminal.jsx
│       │   └── Modals.jsx
│       ├── api.js           # Axios client and JWT header
│       └── App.jsx          # Role-based UI + API orchestration
├── server/
│   ├── src/models/          # User, VisitorRequest, AuditLog
│   ├── src/routes/          # Auth, request, gate, audit APIs
│   ├── src/middleware/      # JWT/role checks, uploads
│   ├── src/utils/           # response mapping, audit, HTTP errors
│   ├── scripts/seed.js      # initial admin/guard accounts
│   └── .env.example
└── package.json             # npm workspaces and root commands
```

## Checks

From the project root:

```powershell
npm run build
npm run lint
```

The zip does not include `node_modules` or credentials; run `npm install` on your machine first.
