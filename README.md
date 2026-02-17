# Register of training providers prototype

The ‘Register of training providers’ is a proof of concept for DfE and, more specifically, Becoming a teacher (BAT) to manage a canonical list of training providers.

This prototype is based on the:

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/)

You can read more about this register on the [design history website](https://becoming-a-teacher.design-history.education.gov.uk/register-of-training-providers/).

## Documentation

- [Architecture documentation](ARCHITECTURE.md) - Technical architecture, design patterns, and codebase structure
- [Deployment guide](DEPLOYMENT.md) - Deployment instructions for various platforms and environments
- [Design history](https://becoming-a-teacher.design-history.education.gov.uk/register-of-training-providers/) - Service and design context

## Requirements

- Node.js 22.x
- npm (compatible with Node 22)

## Quick start

```bash
git clone <repository-url>
cd register-training-providers-prototype
npm install          # installs deps and builds the dev SQLite DB
npm run dev          # start with live reload
```

## Generating data

The prototype uses a SQLite database to store data and includes a set of seed data.

The database is built automatically during `npm install`. To rebuild with fresh seed data:

```bash
npm run db:build:dev
```

### Regenerating seed data from CSV

Provider and partnership seed data is generated from the CSVs in `app/data/dist`. To regenerate the seed JSON (and update the timestamped seeder filenames), run:

```bash
npm run data:regen-seeds
```

This will generate:

- providers
- provider addresses
- provider accreditations
- provider partnerships
- provider academic years

Then seed as normal:

```bash
npm run db:seed
```

Note: `ukprn` and `urn` can be `NULL` in the database. This allows all rows in the CSVs to be seeded even when those fields are missing.

## Environment variables

The prototype uses environment variables to configure runtime and integrations:

| Variable | Type | Description |
| --- | --- | --- |
| `ORDNANCE_SURVEY_API_KEY` | string | The API key needed to access the Ordnance Survey Places API |
| `ORDNANCE_SURVEY_API_SECRET` | string | The API secret needed to access the Ordnance Survey Places API |
| `SESSION_SECRET` | string | Secret used to sign session cookies |
| `API_CLIENT_TOKEN_SECRET` | string | Secret used to hash and validate API client tokens |
| `USE_SIGN_IN_FORM` | boolean (`true`/`false`) | Whether to use the sign-in form instead of personas (default `true`) |

## Tools

If you’re using [Visual Studio (VS) Code](https://code.visualstudio.com/) for prototyping, we recommend you install the following extensions:

- [GOV.UK Design System snippets](https://marketplace.visualstudio.com/items?itemName=simonwhatley.govuk-design-system-snippets)
- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [Nunjucks for VS Code](https://marketplace.visualstudio.com/items?itemName=ronnidc.nunjucks)
- [Nunjucks snippets](https://marketplace.visualstudio.com/items?itemName=luwenjiechn.nunjucks-vscode-snippets)

We also recommend you update your VS Code settings to make sure you’re trimming whitespace: `Files: Trim Trailing Whitespace`.
