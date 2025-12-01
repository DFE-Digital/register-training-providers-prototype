# Register of training providers prototype

The ‘Register of training providers’ is a proof of concept for DfE and, more specifically, Becoming a teacher (BAT) to manage a canonical list of training providers.

This prototype is based on the:

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/)

You can read more about this register on the [design history website](https://becoming-a-teacher.design-history.education.gov.uk/register-of-training-providers/).

## Documentation

- [Architecture documentation](ARCHITECTURE.md) - Technical architecture, design patterns, and codebase structure
- [Deployment guide](DEPLOYMENT.md) - Deployment instructions for various platforms and environments

## Requirements

- Node.js - version 22.x.x

## Installation

- Clone this repository to a folder on your computer
- Open Terminal
- In Terminal, change the path to the repository
- Type `npm install` to install the dependencies

## Working locally

- In Terminal, change the path to the repository
- Type `npm run dev`  and start the application

## Generating data

The prototype uses a SQLite database to store data and includes a set of seed data.

The database is built when you run `npm install`.

You can also regenerate the database:

- In Terminal, change the path to the repository
- Type `npm run build-database`

## Environment variables

The prototype uses environment variables to help configure the application. These include:

| Variable | Type | Description |
| --- | --- | --- |
| `ORDNANCE_SURVEY_API_KEY` | string | The API key needed to access the Ordnance Survey Places API |
| `ORDNANCE_SURVEY_API_SECRET` | string | The API secret needed to access the Ordnance Survey Places API |

## Tools

If you’re using [Visual Studio (VS) Code](https://code.visualstudio.com/) for prototyping, we recommend you install the following extensions:

- [GOV.UK Design System snippets](https://marketplace.visualstudio.com/items?itemName=simonwhatley.govuk-design-system-snippets)
- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [Nunjucks for VS Code](https://marketplace.visualstudio.com/items?itemName=ronnidc.nunjucks)
- [Nunjucks snippets](https://marketplace.visualstudio.com/items?itemName=luwenjiechn.nunjucks-vscode-snippets)

We also recommend you update your VS Code settings to make sure you’re trimming whitespace: `Files: Trim Trailing Whitespace`.
