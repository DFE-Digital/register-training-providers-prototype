# Deployment guide

## Prerequisites

Before deploying the Register of Training Providers prototype, ensure you have:

- **Node.js:** Version 22.x (specified in `package.json`)
- **npm:** Latest version compatible with Node 22
- **Git:** For version control and deployment
- **Database:** SQLite3 (default for all environments; persisted as a file)
- **Port:** Default 3000 (set `PORT` to override)

## Environment setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd register-training-providers-prototype
```

### 2. Install dependencies

```bash
npm install
```

This will:
- Install all Node.js dependencies
- Run the `postinstall` script (builds database with migrations + seeds)

### 3. Configure environment variables

Create a `.env` file in the project root:

```bash
# Environment
NODE_ENV=production

# External APIs
ORDNANCE_SURVEY_API_KEY=your_os_api_key_here
ORDNANCE_SURVEY_API_SECRET=your_os_api_secret_here

# Session Secret (generate a strong random string)
SESSION_SECRET=generate_a_random_32_character_string

# API client token signing
API_CLIENT_TOKEN_SECRET=generate_a_random_64_character_string

# Express / prototype
PORT=3000
USE_SIGN_IN_FORM=true
```

**⚠️ Security warning:**
- Never commit `.env` to version control
- Use different API keys for each environment
- Rotate API keys regularly
- Use environment-specific credentials

### 4. Generate secure secrets

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database setup

### Development (SQLite)

The database is automatically set up during `npm install` via the `postinstall` script. Ensure `API_CLIENT_TOKEN_SECRET` is set before creating API client tokens so hashes can be generated.

Manual setup:

```bash
# Run migrations
npm run db:migrate

# Regenerate seed data from CSVs (optional)
npm run data:regen-seeds

# Seed database with sample data
npm run db:seed
```

Database location: `./app/database/development.sqlite3`

### Production / demo (SQLite-backed)

By default, production also uses SQLite at `./app/database/production.sqlite3`. Ensure your hosting platform persists this path between deploys (bind mount / volume / writable disk). To avoid seeding in production, install with scripts disabled and run migrations only:

```bash
# Install without running postinstall
npm install --ignore-scripts

# Run migrations with production config
NODE_ENV=production npm run db:migrate
```

If you do want demo data in production (e.g. staging), run:

```bash
NODE_ENV=production npm run db:seed
```

If you need to refresh seed data from the latest CSVs in `app/data/dist`, run:

```bash
NODE_ENV=production npm run data:regen-seeds
NODE_ENV=production npm run db:seed
```

### Switching to another database

Sequelize is configured in `app/config/config.json`. Override the `production` block with your target dialect/credentials (for example PostgreSQL) and set `NODE_ENV=production` so migrations use that config.

## Running the application

```bash
# Development with live reload
npm run dev

# Production mode
NODE_ENV=production npm run start
```

The Prototype Kit listens on `PORT` (default 3000). Verify deployment by visiting `/providers` or `/auth/sign-in`.

## Deployment checklist

- [ ] Environment variables set and secrets generated
- [ ] `app/middleware` included in the deploy artifact (auth + API token checks)
- [ ] Database storage location is writable and persisted
- [ ] `npm install` (with or without scripts, per seeding preference) has run
- [ ] `NODE_ENV=production npm run db:migrate` executed
- [ ] `PORT` open on the host platform
- [ ] Health check confirmed at `/providers`
