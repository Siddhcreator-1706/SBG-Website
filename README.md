# SBG-Website

The official portal for the Student Body Government (SBG) of DAU. Far beyond a simple slot booking system, this platform serves as the central hub for campus life. It streamlines everything from venue reservations and real-time master schedules, to comprehensive club membership management, post-event reporting, and automated administrative workflows. Designed to eliminate email chains and double-bookings, it empowers clubs to operate efficiently while giving administrators total visibility and control.

## Features

### Clubs
- **Global schedule** — see every approved booking across all venues at a glance
- **Slot booking** — request a venue with automatic conflict detection
- **Booking management** — track request status, edit pending bookings, submit post-event reports
- **Policy reference** — in-app access to booking rules and guidelines

### Administrators
- **Dashboard** — pending request count, approval stats, and quick actions
- **Request workflow** — review, approve, or reject bookings with optional email notifications
- **Master schedule** — filterable calendar view of all venues

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | NeonDB (Serverless PostgreSQL) |
| **Notifications** | EmailJS (optional) |
| **Deployment** | Vercel (Frontend), PM2 + Apache (Backend), GitHub Actions |

## Prerequisites

- **Node.js** v22+
- **npm**
- A [Neon](https://neon.tech) database project

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sbg-siddh-coder/SBG-Website.git
cd SBG-Website
```

### 2. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 3. Configure environment variables

Copy the example files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**
```env
DATABASE_URL="postgresql://..."
PORT=4000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3005,http://localhost:5173"
JWT_SECRET="local-dev-secret"
```

**`client/.env`**
```env
VITE_API_URL="http://localhost:4000"
```

### 4. Run Database Migrations

Set up the database schema in Neon (ensure your `DATABASE_URL` is set in `server/.env`):

```bash
cd server
npm run migrate
```

### 5. Start development servers

```bash
# Terminal 1 — API server (localhost:4000)
cd server
npm run dev

# Terminal 2 — Frontend (localhost:5173)
cd client
npm run dev
```

## Project Structure

```
SBG-Website/
├── client/                  # React frontend (Deployed to Vercel)
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui primitives
│   │   ├── pages/           # Route-level pages
│   │   ├── App.tsx          # Router & layout
│   │   └── types.ts         # Shared TypeScript types
│   ├── vite.config.ts
│   └── vercel.json          # Vercel SPA routing fallback
│
├── server/                  # Express API (Deployed to CentOS Server)
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth & request middleware
│   │   ├── server.ts        # Entry point
│   │   └── db.ts            # NeonDB (PostgreSQL) connection pool
│   └── migrations/          # SQL schema migrations
│
└── .github/workflows/       # CI/CD pipeline for backend deployment
```

## Production Deployment

This project uses a distributed deployment architecture:
1. **Frontend**: Deployed to Vercel. Connect your GitHub repository to Vercel and set the Root Directory to `client`.
2. **Database**: Hosted on PostgreSQL (e.g., Aiven or Neon).
3. **Backend**: Deployed to a CentOS/Linux server using PM2.

### Deploying the Backend on CentOS

**1. Install Required Software**
Ensure Node.js (v22+), npm, and PM2 are installed on your CentOS server:
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

**2. Deploy via Local Script (When Git Clone is blocked)**
If your CentOS server is on a restricted intranet without GitHub access, you can deploy directly from your local Windows machine using the provided PowerShell script. This script builds the code locally, packages it, transfers it via SCP, and restarts PM2 over SSH.

Open PowerShell on your local machine and run:
```powershell
.\deploy.ps1
```
*(You may be prompted for the SSH password for your server during the transfer and restart steps).*

*Note: Before running the script for the first time, open `deploy.ps1` and ensure the `$ServerUser`, `$ServerIP`, and `$ServerPath` variables match your CentOS server environment.*

**3. Configure Environment Variables**
Copy the example environment file and update the required variables:
```bash
cp .env.example .env
nano .env
```
Ensure you change the following critical variables for production in `server/.env`:
*   `DATABASE_URL`: Your production PostgreSQL connection string (e.g., Aiven URL).
*   `NODE_ENV`: Set this strictly to `"production"`.
*   `CORS_ORIGIN`: Set this to your live frontend URL (e.g., `"https://sbg.dau.ac.in"`).
*   `JWT_SECRET`: Generate a long, secure random string used to sign authentication tokens.
*   `PORT`: The port the backend will run on (e.g., `4000`).

**4. Start the Application with PM2**
```bash
# Start the compiled server
pm2 start dist/server.js --name "sbg-backend"

# Ensure PM2 restarts the app automatically on server reboot
pm2 startup
pm2 save
```

**5. Setup Reverse Proxy (Optional but Recommended)**
Use Apache or Nginx on your CentOS server to reverse-proxy external HTTP/HTTPS traffic to the Node application running on your chosen `PORT` (e.g., 4000).

## Contributing

Contributions are welcome! If you'd like to help improve SBG-Website:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).
