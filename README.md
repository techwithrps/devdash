# Team Work Status Dashboard (devdash)

A clean, professional, lightweight team work status dashboard for internal use with ZIP-based code exchange, connected to PostgreSQL.

## Features

- **Live Work Tracking**: WORKING & COMPLETED tables.
- **Changed Files Tracking**: Track exact file names with quick copy & expand options.
- **Fast Status Updates**: 1-click status change with automatic timestamps.
- **PostgreSQL Backend**: Real-time persistence with REST APIs and indexing.
- **Search & Filters**: Instant multi-attribute search across members, tasks, codebases, and files.
- **Compact & High-Density UI**: Fits 10+ entries comfortably on screen.

## Getting Started

### 1. Setup PostgreSQL Database

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

# Configure .env (optional if using defaults)
cp .env.example .env
```

### 3. Run the Server

```bash
# Start server
npm start
```

Open [http://localhost:3847](http://localhost:3847) in your browser.
