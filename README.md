# StockSense — Smart Inventory Management System

> **Tagline:** Real-Time Inventory, Simplified.  
> **Tech Stack:** React 18, Vite, Express, PostgreSQL, Prisma ORM, JWT, Bcrypt

---

## 🚀 Live Demo Credentials

- **Login ID:** `siyabhosale`
- **Password:** `acc to the otp`
- **Role:** Manager

---

## 📦 System Architecture

```text
stocksense/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # 14 Relational PostgreSQL tables & enums
│   ├── src/
│   │   ├── middleware/          # JWT auth & error handling
│   │   ├── routes/              # All REST endpoints (Auth, Dashboard, Products,
│   │   │                        # Receipts, Deliveries, Transfers, Adjustments, Movements)
│   │   ├── utils/
│   │   │   ├── referenceGenerator.js # Atomic counter references (WH1/IN/001, etc.)
│   │   │   └── stockEngine.js   # Centralized ACID Stock Engine (Receipt, Delivery,
│   │   │                        # Transfer, Adjustment validation & Ledger tracking)
│   │   ├── seed/
│   │   │   └── seed.js          # Idempotent demo dataset
│   │   ├── db.js                # Prisma singleton instance
│   │   └── server.js            # Express API server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/axiosInstance.js # Interceptors + Bearer token
│   │   ├── components/          # Reusable ERP components (DataTable, KPICard,
│   │   │                        # StatusBadge, Modal, Toast, FilterBar)
│   │   ├── context/             # AuthContext (JWT auth state)
│   │   ├── pages/               # Dashboard, Products, Receipts, Deliveries,
│   │   │                        # Transfers, Adjustments, MoveHistory, Warehouses, Locations
│   │   ├── routes/              # ProtectedRoute wrapper
│   │   ├── App.jsx
│   │   └── index.css            # Enterprise ERP styling
│   └── package.json
├── render.yaml                  # 1-Click Render Blueprint deployment
└── README.md
```

---

## ⚡ Direct Render Deployment (Step-by-Step)

### Option A: Using `render.yaml` (Recommended Blueprint)
1. Push this repository to GitHub or GitLab.
2. In your Render Dashboard, click **New +** > **Blueprint**.
3. Select this repository.
4. Render will automatically provision:
   - **PostgreSQL Database** (`stocksense-db`)
   - **Backend Web Service** (`stocksense-api` with automatic Prisma push + seed)
   - **Frontend Static Site** (`stocksense-web`)

### Option B: Manual Setup on Render
1. **Create PostgreSQL Database on Render:**
   - Go to Render Dashboard -> **New +** -> **PostgreSQL**.
   - Name: `stocksense-db`, Database: `stocksense`, User: `stocksense_user`.
   - Copy the **External Database URL**.
2. **Deploy Backend Web Service:**
   - **New +** -> **Web Service** -> connect your repo -> `rootDir: backend`.
   - Build Command: `npm install && npx prisma generate && npx prisma db push && npm run seed`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL`: *(paste connection string from step 1)*
     - `JWT_SECRET`: `your_random_secret_here`
     - `NODE_ENV`: `production`
3. **Deploy Frontend Static Site:**
   - **New +** -> **Static Site** -> connect your repo -> `rootDir: frontend`.
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Rewrite rule: `/*` -> `/index.html`
   - Environment Variable:
     - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

---

## 💻 Running Locally https://stocksense-odoo.onrender.com

### 1. Backend Setup
```bash
cd backend
npm install

# Configure your PostgreSQL connection string in .env:
# DATABASE_URL="postgresql://user:password@host:5432/stocksense?sslmode=require"

# Push schema and seed demo data:
npx prisma db push
npm run seed

# Start API server on http://localhost:5000:
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
```

---

## 🎯 Exact Hackathon Demo Flow (Live Sequence)

1. **Log in** with `demo01` / `Password@123`.
2. **Dashboard:** Verify live KPI counts (Total Products, Low Stock alerts, Out of Stock, Inventory Value).
3. **Products Catalog:** Locate **Steel Rods** (starting on-hand stock = 50).
4. **Receipts:** Create a new receipt for **+100 Steel Rods**; click **Validate**.
5. **Real-Time Update:** Dashboard & Products now show Steel Rods stock = **150**.
6. **Move History:** Ledger shows `WH1/IN/002` +100 in green (`IN`).
7. **Internal Transfer:** Transfer Steel Rods from **Main Warehouse / Rack A** to **Main Warehouse / Rack B**; check that total stock stays 150 while rack distribution changes.
8. **Delivery:** Create delivery for **20 Steel Rods**; validate it.
9. **Real-Time Update:** Stock updates to **130**; Move History logs `-20` in red (`OUT`).
10. **Stock Adjustment:** Create an adjustment with physical counted quantity = **127** (variance: -3, Damaged); validate it.
11. **Final Verification:** Stock reflects **127**; Move History records variance in orange (`ADJUSTMENT`).
12. **Alert Inspection:** Show **Safety Helmet** (flagged amber, low stock ≤ 20) and **Packaging Boxes** (flagged red, out of stock = 0).
