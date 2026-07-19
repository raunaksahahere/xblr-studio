# AI XBRL Studio — Enterprise Production Release

AI XBRL Studio is an enterprise-grade financial intelligence, document understanding, and MCA/XBRL filing generation platform.

---

## 🚀 Quick Start (Local / Production)

### 1. Prerequisites
* **Node.js**: v20.x or higher
* **npm**: v10.x or higher

### 2. Environment Setup & Installation
```bash
# Install dependencies for both backend and frontend workspaces
npm run install:all

# Setup database tables and run initial seeds
npm run db:setup
```

### 3. Running Development Mode
```bash
# Start both Backend (Port 5000) and Frontend (Port 3000) concurrently
npm run dev
```

---

## 📦 Production Deployment & Publishing

### Option A: Node.js / Server Deployment
1. Build the production assets:
   ```bash
   # Build frontend static bundle
   npm run build --prefix frontend

   # Type-check backend
   npm run build --prefix backend
   ```
2. Start backend in production mode:
   ```bash
   cd backend
   npm start
   ```

### Option B: Docker / Container Deployment
1. Build the image:
   ```bash
   docker build -t ai-xbrl-studio:latest .
   ```
2. Run container:
   ```bash
   docker run -d -p 5000:5000 -p 3000:3000 ai-xbrl-studio:latest
   ```

---

## 🔒 Security & Verification Tests

To run E2E verification and tenant isolation test suites:
```bash
# Cross-Tenant Isolation Test
node test_cross_tenant_isolation.js

# Reviewer Copilot & Reconciliation E2E Test
node test_copilot_memory.js
```

---

## 👤 Default Admin Credentials
* **Email**: `admin@xbrlstudio.com`
* **Password**: `AdminSecretPass123`
