# Architecture documentation

## Overview

The Register of training providers prototype is a web application built using the GOV.UK Prototype Kit, Express.js, and Sequelize ORM with SQLite. It follows an MVC (Model-View-Controller) pattern.

## Technology Stack

- **Runtime:** Node.js 22.x
- **Framework:** GOV.UK Prototype Kit 13.18.1
- **Web Server:** Express.js (via Prototype Kit)
- **Database:** SQLite3 5.1.7
- **ORM:** Sequelize 6.37.7
- **Template Engine:** Nunjucks
- **Markdown:** Marked with GFM Heading ID
- **Frontend:** GOV.UK Frontend 5.13.0

## Directory Structure

```
register-training-providers-prototype/
├── app/
│   ├── controllers/         # Request handlers (14 files, ~4,100 LOC)
│   ├── models/              # Sequelize models (16 files)
│   ├── views/               # Nunjucks templates (86 files)
│   ├── helpers/             # Business logic utilities (10 files)
│   ├── services/            # External API integrations (3 files)
│   ├── hooks/               # Sequelize lifecycle hooks (2 files)
│   ├── migrations/          # Database migrations (17 files)
│   ├── seeders/             # Database seed data (5 files)
│   ├── filters.js           # Nunjucks template filters
│   ├── routes.js            # Route definitions
│   ├── config/              # Configuration files
│   └── database/            # SQLite database files
├── package.json
└── .env                     # Environment variables (gitignored)
```

## Architecture layers

### 1. Presentation layer (views)

**Location:** `/app/views/`

- **Template Engine:** Nunjucks
- **Components:** GOV.UK Design System components
- **Structure:**
  - `layouts/` - Page layouts and base templates
  - `_includes/` - Reusable template partials
  - `providers/` - Provider-related views
  - `content/` - Static content pages
  - `errors/` - Error pages

**Key Features:**
- Server-side rendering
- Form validation with error summaries
- Accessible markup following GOV.UK patterns
- Markdown support for content pages

### 2. Controller layer (request handlers)

**Location:** `/app/controllers/`

**Key Controllers:**
- `provider.js` - Provider CRUD operations
- `providerPartnership.js` - Partnership management (971 lines)
- `providerAccreditation.js` - Accreditation management
- `providerAddress.js` - Address management
- `providerContact.js` - Contact management
- `activityLog.js` - Activity log viewing
- `content.js` - Static content rendering

**Responsibilities:**
- Process incoming HTTP requests
- Validate request data
- Call business logic helpers/services
- Query database via models
- Render views with data
- Handle flash messages

**Pattern:**
```javascript
exports.handlerName_get = async (req, res) => {
  // 1. Extract parameters from request
  const { providerId } = req.params

  // 2. Query database
  const provider = await Provider.findByPk(providerId)

  // 3. Call helpers for business logic
  const isAccredited = await isAccreditedProvider({ providerId })

  // 4. Render view with data
  res.render('view-name', { provider, isAccredited })
}
```

### 3. Model layer (data access)

**Location:** `/app/models/`

**ORM:** Sequelize with SQLite

**Key models:**
- `Provider` - Training providers
- `ProviderAccreditation` - Accreditations owned by providers
- `ProviderPartnership` - Accredited ↔ training provider partnerships
- `ProviderPartnershipAcademicYear` - Academic year links for partnerships
- `ProviderAddress` - Provider addresses
- `ProviderContact` - Provider contacts
- `AcademicYear` - Academic year reference data
- `User` - System users
- `ActivityLog` - Audit trail of all changes

**Revision models** (History Tracking):
- `ProviderRevision`
- `ProviderAccreditationRevision`
- `ProviderAddressRevision`
- `ProviderContactRevision`
- `ProviderPartnershipRevision`
- `ProviderPartnershipAcademicYearRevision`
- `UserRevision`
- `AcademicYearRevision`

**Relationships:**
```
Provider
  ├── hasMany ProviderAccreditation
  ├── hasMany ProviderAddress
  ├── hasMany ProviderContact
  ├── hasMany ProviderPartnership (as accreditedProvider)
  └── hasMany ProviderPartnership (as trainingProvider)

ProviderPartnership
  ├── belongsTo Provider (accreditedProvider)
  ├── belongsTo Provider (trainingProvider)
  └── hasMany ProviderPartnershipAcademicYear

ProviderPartnershipAcademicYear
  ├── belongsTo ProviderPartnership
  └── belongsTo AcademicYear
```

### 4. Business logic layer (helpers)

**Location:** `/app/helpers/`

**Key helpers:**
- `activityLog.js` - Activity log queries and formatting (1,217 lines)
- `accreditation.js` - Accreditation business logic
- `partnership.js` - Partnership business logic
- `validation.js` - Input validation functions
- `pagination.js` - Pagination helper class
- `date.js` - Date formatting utilities
- `string.js` - String manipulation utilities
- `content.js` - Content formatting and labels

**Purpose:**
- Encapsulate reusable business logic
- Keep controllers thin and focused
- Provide tested, documented functions
- Share logic across multiple controllers

### 5. Service layer (external integrations)

**Location:** `/app/services/`

**Services:**
- `ordnanceSurveyPlaces.js` - Address lookup via OS Places API
- `googleMaps.js` - Geocoding via Google Maps API
- `partnerships.js` - Bulk partnership creation

**Pattern:**
```javascript
// Error handling and API retry logic
// Returns normalized data structures
// Handles API failures gracefully
```

### 6. Data persistence layer

**Database:** SQLite3

**Configuration:** `/app/config/config.json`

**Environments:**
- `development` - `./app/database/development.sqlite3`
- `test` - `./app/database/test.sqlite3`
- `production` - `./app/database/production.sqlite3`

**Features:**
- Underscored column names (`created_at` vs `createdAt`)
- Paranoid mode (soft deletes)
- Revision tracking via hooks
- Automatic timestamps

## Data flow

### Read operation (GET request)
```
1. User Request → Express Router
2. Router → Controller Handler
3. Controller → Model Query (via Sequelize)
4. Model → SQLite Database
5. Database → Model (results)
6. Controller → Helper Functions (business logic)
7. Helper → Controller (processed data)
8. Controller → View Template (Nunjucks)
9. View → User Response (HTML)
```

### Write operation (POST request)
```
1. User Request → Express Router
2. Router → Controller Handler
3. Controller → Validation (helpers)
4. Controller → Model Create/Update
5. Model → Sequelize Hook (beforeCreate/afterCreate)
6. Hook → Revision Model (create revision)
7. Hook → Activity Log (create log entry)
8. Transaction Commit
9. Controller → Flash Message
10. Controller → Redirect (PRG pattern)
```

## Key design patterns

### 1. Post/Redirect/Get (PRG)

All form submissions follow PRG pattern:
```javascript
exports.create_post = async (req, res) => {
  await Model.create(data)
  req.flash('success', 'Record created')
  res.redirect('/path')  // Prevents double-submit
}
```

### 2. Revision tracking (event sourcing)

Every model change creates:
- A revision record (full snapshot)
- An activity log entry (metadata)

Implemented via Sequelize hooks:
```javascript
Model.addHook('afterCreate', revisionHook)
Model.addHook('afterUpdate', revisionHook)
```

### 3. Soft deletes (paranoid mode)

Records are never truly deleted:
```javascript
// Sets deletedAt timestamp instead of removing row
await provider.destroy()

// Can query deleted records
await Provider.findAll({ paranoid: false })
```

### 4. Factory pattern (hooks)

Reusable hook factories:
```javascript
const revisionHook = require('../hooks/revisionHook')
const activityHook = require('../hooks/activityHook')

Model.addHook('afterCreate', revisionHook({
  revisionTable: 'model_revisions',
  entityType: 'model'
}))
```

### 5. Repository pattern (helpers)

Complex queries encapsulated in helper functions:
```javascript
const { getProviderActivityLogs } = require('../helpers/activityLog')

const logs = await getProviderActivityLogs({
  providerId,
  limit: 25,
  offset: 0
})
```
