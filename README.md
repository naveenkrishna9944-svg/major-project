# Mart Management System — MEAN Stack

The same Mart Management System (POS, products, inventory, suppliers, customers, purchases,
sales, reports, employees, notifications, settings), rebuilt on the **MEAN** stack:

| Layer | Before | Now |
|-------|--------|-----|
| Database | MySQL (XAMPP) | **MongoDB** (Mongoose) |
| Backend | PHP | **Node.js + Express** |
| Frontend | React + Vite | **Angular 21** (standalone components) |
| Styling | Tailwind CSS v4 | Tailwind CSS v4 (same look, same dark mode) |

Every screen, button, validation message and API response from the original is preserved.
The API keeps the same endpoints (just without `.php`) and the same `{ status, message, data }`
response format, so `API_DOCUMENTATION.md` still describes it.

---

## 1. Requirements (Windows)

| Tool | Version | Check in PowerShell |
|------|---------|---------------------|
| Node.js | 20.19 or newer (22 / 24 are fine) | `node -v` |
| MongoDB Community Server | 6.0 or newer | `Get-Service MongoDB` |

**Install MongoDB:** download *MongoDB Community Server* from mongodb.com, run the installer and keep
**"Install MongoDB as a Service"** ticked. It then starts automatically on `mongodb://127.0.0.1:27017`.
If the service is stopped, start it from an **Administrator** PowerShell:

```powershell
Start-Service MongoDB
```

XAMPP / Apache / MySQL are **not needed** any more.

> Prefer a cloud database? Create a free MongoDB Atlas cluster and put its connection string
> in `backend\.env` as `MONGO_URI=...`.

---

## 2. Setup

Open PowerShell in this folder and run these one at a time:

```powershell
npm run install:all
npm run seed
npm run dev
```

* `npm run install:all` installs the backend, the frontend and the helper that runs both together.
* `npm run seed` loads the demo data into MongoDB (database name: `mart_management`).
  Running it again wipes and recreates the demo data.
* `npm run dev` starts the API on **http://localhost:5000** and the Angular app on **http://localhost:4200**.

Open **http://localhost:4200** (use `localhost`, not `127.0.0.1`, so the login cookie works).

### Default logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mart.com` | `admin123` |
| Employee | `employee@mart.com` | `employee123` |

### Running the two parts separately

```powershell
# Terminal 1 – API
cd backend
npm run dev

# Terminal 2 – Angular
cd frontend
npm start
```

### Configuration

`backend\.env` (created for you, see `.env.example`):

Keep credentials in `.env` files; Git ignores these files except `.env.example`.

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mart_management
SESSION_SECRET=change-this-to-a-long-random-string
CLIENT_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

If you change the API port or host, also update `frontend\src\app\core\config.ts`.

### Production build of the frontend

```powershell
npm run build
```

The output is created in `frontend\dist\frontend\browser`.

---

## 3. Project structure

```
backend/
  server.js                 Express app, sessions (stored in MongoDB), CORS, static /uploads
  src/
    config/env.js           reads .env
    models/                 Mongoose models (one per old SQL table)
    routes/                 auth, dashboard, products, categories, suppliers, customers,
                            employees, inventory, pos, sales, purchases, reports,
                            notifications, settings
    middleware/auth.js      requireLogin / requireRole('Admin')
    utils/                  response envelope, auto-increment ids, stock helpers
    seed/seed.js            demo data (same data as the old database.sql)
  uploads/products/         uploaded product images

frontend/
  src/app/
    core/                   ApiService, AuthService, route guard, theme, toasts
    shared/                 layout, sidebar, navbar, table, charts, icons, stat cards...
    pages/                  one standalone component per screen
    utils/                  CSV/PDF export, barcode printing, formatting
```

---

## 4. What changed under the hood (behaviour is the same)

* **Numeric ids are kept.** Each collection has an auto-incrementing numeric `id`, so API
  responses look exactly like the old SQL rows and the UI needed no changes.
* **Stock updates are atomic.** The PHP code used SQL transactions. MongoDB only offers
  transactions on replica sets, so the Node code uses atomic conditional updates
  (`quantity >= requested`) and rolls back automatically if a sale line fails. This works on a
  normal single MongoDB install and still prevents overselling.
* **Deleting** records mirrors the old foreign keys: deleting a product also removes its sale and
  purchase lines, stock history and reorder requests; deleting a supplier/customer/employee clears
  the references (`SET NULL`) exactly like before.
* **Sessions** use a cookie like PHP sessions did, but are stored in MongoDB (`sessions` collection).
* **Passwords** are hashed with bcrypt; the seed script generates the hashes for you.
* **Seed dates are relative.** The old SQL sample data was written for 20 July 2026. The seed shifts
  all demo dates so that day becomes *today*, which keeps the dashboard, low-stock and expiry
  screens meaningful instead of showing everything as expired.
* **Charts** use Chart.js and **icons** use Lucide (same icon set as before).

---

## 5. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Failed to start server: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. `Start-Service MongoDB` in an Administrator PowerShell. |
| Login says "Login failed." | The API is not running or the Angular app is not on `localhost:4200`. Start `npm run dev` and use `http://localhost:4200`. |
| `Invalid email or password.` | Run `npm run seed` again, then log in with the credentials above. |
| Port 5000 / 4200 already in use | Change `PORT` in `backend\.env` (and `API_BASE_URL` in `frontend\src\app\core\config.ts`), or start Angular with `npm start -- --port 4300` (and add that origin to `CLIENT_ORIGINS`). |
| `npm run install:all` is slow | The first install downloads about 600 MB of packages for Angular; later runs are fast. |
