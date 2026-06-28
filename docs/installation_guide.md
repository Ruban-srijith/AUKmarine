# Marine ERP Installation & Operational Guide

This document explains how to set up, configure, and launch the Marine ERP Inventory & Sales Management system locally or in production.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.x or higher)
- **NPM** (v9.x or higher)
- **PostgreSQL** database (Local instance, Docker container, or cloud databases like Supabase/Aiven)

---

## 2. Directory Structure

The project has been generated in the following professional structure:
```
marineERPsoftware/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma models definition
│   │   └── seed.js              # Seed script with default users & mock data
│   ├── src/
│   │   ├── controllers/         # Business logic handlers
│   │   ├── middleware/          # JWT auth & role authorization
│   │   ├── routes/              # Express API endpoints mapping
│   │   ├── utils/               # Prisma client singleton & Winston loggers
│   │   └── app.js & server.js   # Server setups
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/          # Navigation, Layout, ProtectedRoute boundaries
│   │   ├── context/             # AuthState & Notifications state
│   │   ├── pages/               # Individual Dashboard/POS pages
│   │   ├── services/            # Axios API config
│   │   ├── App.jsx & main.jsx   # SPA routing & mounts
│   │   └── index.css            # Tailwind, glassmorphism scrollbars
│   ├── package.json
│   └── vite.config.js
└── docs/
    └── installation_guide.md    # This setup manual
```

---

## 3. Database Configurations

1. Open the file `backend/.env`.
2. Locate the `DATABASE_URL` line:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marine_erp?schema=public"
   ```
3. Update the credentials (`username`, `password`, `host`, `port`, and `database_name`) to match your PostgreSQL server. If using a service like **Supabase**, replace this link with the URI provided in your project settings.

---

## 4. Run Migration and Seed Default Data

Once your PostgreSQL database is running and your `.env` is configured, execute the following commands in your terminal:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Run Prisma migrations to deploy database tables
npx prisma migrate dev --name init

# 3. Seed the database with default accounts & mock products
npm run prisma:seed
```

---

## 5. Startup the Applications

To run the ERP system, start both the backend API server and the frontend Vite web server.

### Start the Backend (API Server on Port 5000):
```bash
cd backend
npm run dev
```

### Start the Frontend (Vite server on Port 5173):
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Default Seed Credentials (for testing)

Use the following logins to test different role permissions:

| User Role | Email | Password | Allowed Sections / Operations |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@marine.com` | `owner123` | Full access, settings updates, user role controls, profit metrics, product deletes. |
| **Manager** | `manager@marine.com` | `manager123` | Inventory CRUD, purchases inwards, sales POS. Cannot delete products or view settings/users. |
| **Staff** | `staff@marine.com` | `staff123` | Access POS screen to search items, scan barcodes, checkout cart. Cannot access reports, settings, or user control panels. |

---

## 7. Operational Features Quick Reference

- **simulated Barcode Scanning**: On the POS screen or Inventory lists, tap **Simulate Scan** and choose preset codes (like `035762118331` for oil or `753759247348` for radar) to trigger direct cart checkouts.
- **Bulk CSV Upload**: Upload spreadsheet files conforming to: `name`, `code`, `barcode`, `purchasePrice`, `sellingPrice`, `quantity` to bulk insert stock details.
- **Reporting**: Click **Download CSV** or **Print Report** in the Reports section to compile printable lists immediately.
