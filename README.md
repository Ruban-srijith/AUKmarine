# AUKmarine - Marine ERP Software

A full-stack Marine ERP Inventory & Sales Management system built with Node.js, Express, Prisma, and React (Vite + Tailwind CSS).

---

## Overview

AUKmarine is designed for marine parts, supplies, and vessel equipment operations. It provides role-based access control, barcode-driven point-of-sale (POS), stock inventory tracking, purchase management, and financial reporting.

---

## Key Features

- **Role-Based Access Control**:
  - **Owner**: Full system access, company settings, user permissions, profit metrics.
  - **Manager**: Inventory CRUD, purchase receiving, POS operations.
  - **Staff**: Dedicated POS screen for barcode scanning and order checkouts.
- **Inventory & Stock Control**: Real-time stock levels, low-stock warnings, barcode lookups, and bulk CSV imports.
- **Point of Sale (POS)**: Fast checkout workflow, cart calculations, simulated barcode scanner.
- **Purchases & Suppliers**: Inward goods receiving, supplier directory, and purchase order tracking.
- **Reports & Analytics**: Sales summaries, profit margins, CSV data export, and print-ready receipts/reports.

---

## Tech Stack

- **Backend**: Node.js, Express.js, Prisma ORM, JWT Authentication, Winston Logger
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Axios
- **Database**: SQLite / PostgreSQL compatible via Prisma

---

## Getting Started

For detailed installation and setup instructions, refer to the [Installation Guide](docs/installation_guide.md).

### Quick Setup

1. **Install Dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure Environment**:
   - Copy `backend/.env.example` to `backend/.env` and update configuration parameters.

3. **Database Migration & Seed**:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```

4. **Run Development Servers**:
   ```bash
   # Terminal 1 - Backend API (Port 5000)
   cd backend && npm run dev

   # Terminal 2 - Frontend UI (Port 5173)
   cd frontend && npm run dev
   ```

---

## License

ISC
