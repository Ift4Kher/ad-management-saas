# AdSync — Unified Multi-Platform Ad Campaign Management SaaS

AdSync is an enterprise-grade SaaS platform to create, launch, automate, and track performance across Google Ads, Meta Ads (Facebook & Instagram), and TikTok Ads from one unified dashboard.

---

### 🚀 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: **MySQL 8+** (cPanel / PlanetScale / Railway / Aiven)
- **Caching & Queues**: Upstash Redis (TLS) + BullMQ
- **Encryption**: AES-256-GCM for OAuth tokens at rest

---

### 🗄️ Database Configuration (MySQL 8+)

AdSync uses **MySQL 8+** with Prisma ORM.

#### Environment Variable
Set `DATABASE_URL` in `backend/.env`:
```env
DATABASE_URL="mysql://lazyski1_ads-manager:24461139lazyskippeR@localhost:3306/lazyski1_ads-manager"
```

#### Running Database Migrations & Seeding
```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run Migrations to Create MySQL Tables
npx prisma migrate deploy

# Seed Initial Super Admin & Demo Accounts
npx prisma db seed
```

---

### 🔑 Default System Credentials

| Role | Email | Password | Dashboard Link |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@adsync.com` | `AdminPass123!` | [https://ads-manager.lazyskipper.shop/dashboard/admin](https://ads-manager.lazyskipper.shop/dashboard/admin) |
| **Business Owner (Alpha)** | `user_alpha@adsync.test` | `Password123!` | [https://ads-manager.lazyskipper.shop/dashboard](https://ads-manager.lazyskipper.shop/dashboard) |
| **Business Owner (Beta)** | `user_beta@adsync.test` | `Password123!` | [https://ads-manager.lazyskipper.shop/dashboard](https://ads-manager.lazyskipper.shop/dashboard) |
