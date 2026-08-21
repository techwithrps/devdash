# Team Work Status Dashboard (devdash)

A clean, professional, lightweight team work status dashboard for internal use with ZIP-based code exchange, connected to PostgreSQL.

---

## 🔑 Required Environment Variables

Create a `.env` file in the root directory (or add in **Vercel Project Settings → Environment Variables**):

### For Cloud / Vercel (Recommended):
```env
DATABASE_URL=postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/teamdashboard?sslmode=require
```

### For Local Development:
```env
PORT=3847
PGHOST=localhost
PGPORT=5432
PGDATABASE=teamdashboard
PGUSER=postgres
PGPASSWORD=your_password
```

---

## 🚀 Quick Setup

### 1. Setup Local PostgreSQL Database

```bash
# Create database
createdb teamdashboard

# Apply schema
psql teamdashboard -f schema.sql
```

### 2. Install & Configure

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

### 3. Run Locally

```bash
# Start server
npm start
```
Open [http://localhost:3847](http://localhost:3847) in your browser.

---

## ☁️ Vercel Deployment

1. Push your repository to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. In **Environment Variables**, add:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://...` (your Neon/Supabase PostgreSQL connection string)
4. Click **Deploy**.
