# Deployment guide

## Prerequisites

Before deploying the Register of Training Providers prototype, ensure you have:

- **Node.js:** Version 22.x (specified in `package.json`)
- **npm:** Latest version compatible with Node 22
- **Git:** For version control and deployment
- **Database:** SQLite3 (development) or PostgreSQL (production recommended)

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
- Run the `postinstall` script (builds database)

### 3. Configure environment variables

Create a `.env` file in the project root:

```bash
# Environment
NODE_ENV=production

# External APIs
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
ORDNANCE_SURVEY_API_KEY=your_os_api_key_here
ORDNANCE_SURVEY_API_SECRET=your_os_api_secret_here

# Session Secret (generate a strong random string)
SESSION_SECRET=generate_a_random_32_character_string
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

The database is automatically set up during `npm install` via the `postinstall` script.

Manual setup:

```bash
# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

Database location: `./app/database/development.sqlite3`
