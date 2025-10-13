const { Op } = require('sequelize')
const {
  ActivityLog,
  Provider,
  ProviderAccreditation,
  ProviderAccreditationPartnership,
  ProviderAccreditationPartnershipRevision,
  ProviderAccreditationRevision,
  ProviderAddress,
  ProviderAddressRevision,
  ProviderContact,
  ProviderContactRevision,
  ProviderRevision,
  User,
  UserRevision
} = require('../models')

const { govukDate, isToday, isYesterday } = require('./date')
const { getProviderTypeLabel } = require('./content')

/**
 * Maps revision table names to their associated include alias.
 * @type {Object.<string, string>}
 */
const revisionAssociationMap = {
  provider_revisions: 'providerRevision',
  provider_accreditation_revisions: 'providerAccreditationRevision',
  provider_address_revisions: 'providerAddressRevision',
  provider_contact_revisions: 'providerContactRevision',
  provider_accreditation_partnership_revisions: 'providerAccreditationPartnershipRevision',
  user_revisions: 'userRevision'
}

/**
 * Maps revision table names to their Sequelize model.
 * @type {Object.<string, import('sequelize').Model>}
 */
const revisionModels = {
  provider_revisions: ProviderRevision,
  provider_accreditation_revisions: ProviderAccreditationRevision,
  provider_address_revisions: ProviderAddressRevision,
  provider_contact_revisions: ProviderContactRevision,
  provider_accreditation_partnership_revisions: ProviderAccreditationPartnershipRevision,
  user_revisions: UserRevision
}

/**
 * Returns the Sequelize model for the given revision table.
 *
 * @param {string} revisionTable - Name of the revision table (e.g. 'provider_revisions').
 * @returns {import('sequelize').Model} The associated Sequelize model.
 */
const getRevisionModel = (revisionTable) => revisionModels[revisionTable]

/**
 * Safely escape a string for inclusion in HTML by replacing the five
 * special characters `&`, `<`, `>`, `"` and `'` with their entity forms.
 *
 * This is useful when rendering untrusted text into HTML to prevent
 * injection/XSS via text nodes or attribute values.
 *
 * Note:
 * - This function **does not** decode entities.
 * - It assumes plain text input; if you pass already-escaped HTML,
 *   it will escape the ampersands again (idempotent for safe text usage).
 *
 * @param {string} [s=''] - The input string to escape. `null`/`undefined` are coerced to `''`.
 * @returns {string} The escaped HTML-safe string.
 *
 * @example
 * escapeHtml(`<a href="?q=tea & biscuits">"Click"</a>`);
 * // "&lt;a href=&quot;?q=tea &amp; biscuits&quot;&gt;&quot;Click&quot;&lt;/a&gt;"
 */
const escapeHtml = (s = '') =>
  String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;')

/**
 * Append a section path (e.g. "partnerships") to a base provider href.
 * - Returns an empty string if `href` is falsy (provider not listable).
 * - Normalises slashes to avoid double slashes.
 *
 * @param {string | null | undefined} href - Base provider URL (e.g. "/providers/12345").
 * @param {string} section - Section path to append (e.g. "partnerships" or "/partnerships/").
 * @returns {string} The combined URL, or '' if `href` is falsy.
 *
 * @example
 * appendSection('/providers/abc', 'partnerships')
 * // → "/providers/abc/partnerships"
 *
 * @example
 * appendSection('/providers/abc/', '/partnerships/')
 * // → "/providers/abc/partnerships"
 *
 * @example
 * appendSection('', 'partnerships')
 * // → ""
 */
const appendSection = (href, section) => {
  if (!href) return ''
  const base = String(href).replace(/\/+$/, '')           // trim trailing slashes
  const sec  = String(section || '').replace(/^\/+|\/+$/g, '') // trim leading/trailing slashes
  return sec ? `${base}/${sec}` : base
}

/**
 * Decide whether a provider should be linkable (listed) in the register UI.
 *
 * A provider is considered "listable" only if it has not been soft-deleted
 * and is not archived. Extend this predicate if you have additional gating
 * flags (e.g. `isActive`).
 *
 * @param {import('../models').Provider | null | undefined} provider
 *   A Sequelize Provider instance fetched with `{ paranoid: false }`, or null/undefined.
 * @returns {boolean}
 *   `true` if the provider is currently listable (safe to link to), otherwise `false`.
 *
 * @example
 * const provider = await Provider.findByPk(id, { paranoid: false });
 * if (isProviderListable(provider)) {
 *   // render link
 * } else {
 *   // render plain text
 * }
 */
const isProviderListable = (provider) =>
  provider && provider.deletedAt == null // && provider.archivedAt == null

/**
 * Build a safe provider link (or plain text) depending on its current listable state.
 *
 * This helper:
 *  - Looks up the provider with `{ paranoid: false }` so soft-deleted rows are visible.
 *  - Returns a *link* only if the provider passes `isProviderListable`.
 *  - Falls back to plain text (no link) when the provider is missing or not listable.
 *
 * @async
 * @param {string | null | undefined} providerId
 *   The provider's UUID (or undefined/null). If falsy, the function uses the fallback name.
 * @param {string | null | undefined} fallbackName
 *   A label to use if the provider name can't be resolved (e.g. from the log payload).
 * @returns {Promise<{text: string, href: string, html: string}>}
 *   - `text`: The chosen display name (resolved from provider or `fallbackName`).
 *   - `href`: The canonical provider URL (empty string if not listable).
 *   - `html`: A safe HTML string (linked when listable, escaped plain text otherwise).
 *
 * @example
 * const { text, href, html } = await buildProviderLink(revision.providerId, revision.operatingName);
 * // Use `text` for non-HTML contexts, `html` for inline rich rendering, and `href` for tables.
 *
 * @example
 * // Composing a section-specific link when listable:
 * const { href } = await buildProviderLink(revision.providerId, 'Provider');
 * const contactsHref = href ? `${href}/contacts` : ''; // empty string when not listable
 */
const buildProviderLink = async (providerId, fallbackName) => {
  if (!providerId) return { text: fallbackName || 'Provider', href: '', html: escapeHtml(fallbackName || 'Provider') }

  const provider = await Provider.findByPk(providerId, {
    paranoid: false,
    attributes: ['id', 'operatingName', 'legalName', 'deletedAt', 'archivedAt']
  })

  const text = provider?.operatingName || provider?.legalName || fallbackName || 'Provider'
  const href = isProviderListable(provider) ? `/providers/${provider.id}` : ''
  const html = href ? `<a class="govuk-link" href="${href}">${escapeHtml(text)}</a>` : escapeHtml(text)
  return { text, href, html }
}

/**
 * Decide whether a user should be linkable (listed) in the UI.
 *
 * A user is considered "listable" only if they have not been soft-deleted
 * (i.e. `deletedAt == null`). If you also require an active flag, the check
 * includes `isActive !== false`. Adjust this predicate to your needs.
 *
 * @param {import('../models').User | null | undefined} user
 *   A Sequelize User instance fetched with `{ paranoid: false }`, or null/undefined.
 * @returns {boolean}
 *   `true` if the user is currently listable (safe to link to), otherwise `false`.
 *
 * @example
 * const user = await User.findByPk(id, { paranoid: false });
 * if (isUserListable(user)) {
 *   // render link
 * } else {
 *   // render plain text
 * }
 */
const isUserListable = (user) =>
  !!user && user.deletedAt == null && user.isActive !== false

/**
 * Build a safe user link (or plain text) depending on current listable state.
 *
 * This helper:
 *  - Looks up the user with `{ paranoid: false }` so soft-deleted rows are visible.
 *  - Returns a *link* only if the user passes `isUserListable`.
 *  - Falls back to plain text (no link) when the user is missing or not listable.
 *
 * @async
 * @param {string | null | undefined} userId
 *   The user's UUID (or undefined/null). If falsy, the function uses the fallback name.
 * @param {string | null | undefined} [fallbackName]
 *   A label to use if the user’s name can't be resolved (e.g. from the log payload).
 * @returns {Promise<{text: string, href: string, html: string}>}
 *   - `text`: The chosen display name (resolved from user or `fallbackName`).
 *   - `href`: The canonical user URL (empty string if not listable).
 *   - `html`: A safe HTML string (linked when listable, escaped plain text otherwise).
 *
 * @example
 * const { text, href, html } = await buildUserLink(log.changedById, 'Unknown user');
 * // Use `text` for non-HTML contexts, `html` for inline rendering, and `href` for tables.
 *
 * @example
 * // Composing a section-specific link when listable:
 * const { href } = await buildUserLink(log.changedById, 'User');
 * const activityHref = href ? `${href}/activity` : ''; // empty string when not listable
 */
const buildUserLink = async (userId, fallbackName) => {
  if (!userId) {
    const text = fallbackName || 'User'
    return { text, href: '', html: escapeHtml(text) }
  }

  const user = await User.findByPk(userId, {
    paranoid: false,
    attributes: ['id', 'firstName', 'lastName', 'email', 'deletedAt', 'isActive']
  })

  // Prefer a proper name; fall back to email; then to the provided fallback.
  const derivedName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    : ''
  const text = derivedName || user?.email || fallbackName || 'User'

  // TODO: If your route isn’t `/users/:id`, change the href here.
  const href = isUserListable(user) ? `/users/${user.id}` : ''
  const html = href
    ? `<a class="govuk-link" href="${href}">${escapeHtml(text)}</a>`
    : escapeHtml(text)

  return { text, href, html }
}

/**
 * Returns the foreign key(s) used by the revision table for previous/latest lookups.
 *
 * NOTE: For partnership *revision* tables, the entity is the partnership itself,
 * so we use `providerAccreditationPartnershipId`.
 *
 * @param {string} revisionTable - Name of the revision table.
 * @returns {string[]} Array of foreign key fields.
 */
const getEntityKeys = (revisionTable) => {
  switch (revisionTable) {
    case 'user_revisions':
      return ['userId']
    case 'provider_accreditation_partnership_revisions':
      return ['providerAccreditationPartnershipId']
    default:
      // provider_*, provider_accreditation_*, provider_address_*, provider_contact_*
      return ['providerId']
  }
}

/**
 * Formats a raw ActivityLog instance by attaching its revision and generating a summary.
 *
 * @async
 * @param {import('sequelize').Model} log - A Sequelize ActivityLog instance with includes.
 * @returns {Promise<Object>} A plain object including `revision` and `summary` fields.
 */
const formatActivityLog = async (log) => {
  try {
    const logJson = log.toJSON()
    const alias = revisionAssociationMap[log.revisionTable]
    const revision = log[alias] || null
    logJson.revision = revision ? (revision.toJSON?.() || revision) : null
    logJson.summary = await getRevisionSummary({
      revision: logJson.revision,
      revisionTable: log.revisionTable,
      ...logJson
    })
    return logJson
  } catch (err) {
    console.error(`Error processing activity log ${log.id}:`, err)
    return {
      ...log.toJSON(),
      revision: null,
      summary: {
        label: 'Error loading revision',
        fields: []
      }
    }
  }
}

/**
 * Fetches all activity logs, optionally filtered by entity ID, and formats them.
 *
 * @async
 * @param {Object} options
 * @param {string|null} [options.entityId] - Optional ID of the entity to filter logs.
 * @param {number} [options.limit=25] - Maximum number of logs to return.
 * @param {number} [options.offset=0] - Number of logs to skip (for pagination).
 * @returns {Promise<Object[]>} Array of formatted activity log entries.
 */
const getActivityLogs = async ({ entityId = null, limit = 25, offset = 0 }) => {
  const whereClause = entityId ? { entityId } : {}

  const activityLogs = await ActivityLog.findAll({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationPartnershipRevision,
        as: 'providerAccreditationPartnershipRevision',
        include: [
          {
            model: ProviderAccreditation,
            as: 'providerAccreditation',
            include: [{ model: Provider, as: 'provider' }]
          },
          { model: Provider, as: 'partner' }
        ]
      },
      {
        model: UserRevision,
        as: 'userRevision'
      },
      {
        model: User,
        as: 'changedByUser'
      }
    ],
    order: [['changedAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset
  })

  return Promise.all(activityLogs.map(formatActivityLog))
}

/**
 * Fetches activity logs related to a specific provider across all relevant revision tables.
 *
 * @async
 * @param {Object} options
 * @param {string} options.providerId - The ID of the provider.
 * @param {number} [options.limit=25] - Maximum number of logs to return.
 * @param {number} [options.offset=0] - Number of logs to skip (for pagination).
 * @returns {Promise<Object[]>} Array of formatted activity log entries.
 */
const getProviderActivityLogs = async ({ providerId, limit = 25, offset = 0 }) => {
  if (!providerId) throw new Error('providerId is required')

  const queries = []

  const sharedIncludes = (model, as) => [
    {
      model,
      as,
      where: { providerId },
      include: [{ model: Provider, as: 'provider' }]
    },
    { model: User, as: 'changedByUser' }
  ]

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_revisions' },
    include: sharedIncludes(ProviderRevision, 'providerRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_accreditation_revisions' },
    include: sharedIncludes(ProviderAccreditationRevision, 'providerAccreditationRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_address_revisions' },
    include: sharedIncludes(ProviderAddressRevision, 'providerAddressRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_contact_revisions' },
    include: sharedIncludes(ProviderContactRevision, 'providerContactRevision')
  }))

  // Partnerships: show items where this provider is EITHER the accredited provider OR the training partner
  queries.push(ActivityLog.findAll({
    where: {
      revisionTable: 'provider_accreditation_partnership_revisions',
      [Op.or]: [
        // training partner side
        { '$providerAccreditationPartnershipRevision.partner.id$': providerId },
        // accredited provider side (via the accreditation’s provider)
        { '$providerAccreditationPartnershipRevision.providerAccreditation.provider.id$': providerId }
      ]
    },
    include: [
      {
        model: ProviderAccreditationPartnershipRevision,
        as: 'providerAccreditationPartnershipRevision',
        required: true,
        include: [
          {
            model: ProviderAccreditation,
            as: 'providerAccreditation',
            include: [{ model: Provider, as: 'provider' }]
          },
          { model: Provider, as: 'partner' }
        ]
      },
      { model: User, as: 'changedByUser' }
    ],
    // Prevent duplicate ActivityLog rows when JOINs fan out
    distinct: true,
    subQuery: false, // needed so $…$ paths filter the main query
    order: [['changedAt', 'DESC']],
    limit,
    offset
  }))

  const allLogs = (await Promise.all(queries)).flat()
  const byId = new Map()
  for (const row of allLogs) byId.set(row.id, row)
  const activityLogs = Array.from(byId.values())
    .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
    .slice(offset, offset + limit)

  return Promise.all(activityLogs.map(formatActivityLog))

}

/**
 * Returns the total count of activity logs for a specific provider across all revision types.
 *
 * @async
 * @param {Object} options
 * @param {string} options.providerId - The provider ID to count activity for.
 * @returns {Promise<number>} Total count of logs.
 */
const getProviderActivityTotalCount = async ({ providerId }) => {
  if (!providerId) throw new Error('providerId is required')

  const results = await Promise.all([
    ActivityLog.count({
      where: { revisionTable: 'provider_revisions' },
      include: [{
        model: ProviderRevision,
        as: 'providerRevision',
        required: true,
        where: { providerId }
      }]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_accreditation_revisions' },
      include: [{
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        required: true,
        where: { providerId }
      }]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_address_revisions' },
      include: [{
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        required: true,
        where: { providerId }
      }]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_contact_revisions' },
      include: [{
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        required: true,
        where: { providerId }
      }]
    }),
    ActivityLog.count({
      where: {
        revisionTable: 'provider_accreditation_partnership_revisions',
        [Op.or]: [
          { '$providerAccreditationPartnershipRevision.partner.id$': providerId },
          { '$providerAccreditationPartnershipRevision.providerAccreditation.provider.id$': providerId }
        ]
      },
      include: [
        {
          model: ProviderAccreditationPartnershipRevision,
          as: 'providerAccreditationPartnershipRevision',
          required: true,
          include: [
            {
              model: ProviderAccreditation,
              as: 'providerAccreditation',
              include: [{ model: Provider, as: 'provider' }]
            },
            { model: Provider, as: 'partner' }
          ]
        }
      ],
      distinct: true,
      col: 'id',
      subQuery: false
    })
  ])

  return results.reduce((sum, count) => sum + count, 0)
}

/**
 * Fetches all activity logs made by a specific user, optionally filtered by revision table(s).
 *
 * @async
 * @param {Object} options
 * @param {string} options.userId - ID of the user who made the changes.
 * @param {string|string[]|null} [options.revisionTable] - Optional table(s) to filter by.
 * @param {number} [options.limit=25] - Maximum number of logs to return.
 * @param {number} [options.offset=0] - Number of logs to skip (for pagination).
 * @returns {Promise<Object[]>} Array of formatted activity logs.
 */
const getUserActivityLogs = async ({ userId, revisionTable = null, limit = 25, offset = 0 }) => {
  if (!userId) throw new Error('userId is required')

  const whereClause = { changedById: userId }
  if (revisionTable) {
    whereClause.revisionTable = Array.isArray(revisionTable) ? { [Op.in]: revisionTable } : revisionTable
  }

  const activityLogs = await ActivityLog.findAll({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationPartnershipRevision,
        as: 'providerAccreditationPartnershipRevision',
        include: [
          {
            model: ProviderAccreditation,
            as: 'providerAccreditation',
            include: [{ model: Provider, as: 'provider' }]
          },
          { model: Provider, as: 'partner' }
        ]
      },
      {
        model: UserRevision,
        as: 'userRevision'
      },
      {
        model: User,
        as: 'changedByUser'
      }
    ],
    order: [['changedAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset
  })

  return Promise.all(activityLogs.map(formatActivityLog))
}

/**
 * Returns the total number of activity logs created by a user, optionally filtered by revision table(s).
 *
 * @async
 * @param {Object} options
 * @param {string} options.userId - ID of the user.
 * @param {string|string[]|null} [options.revisionTable] - Optional table(s) to filter by.
 * @returns {Promise<number>} Total number of logs.
 */
const getUserActivityTotalCount = async ({ userId, revisionTable = null }) => {
  if (!userId) throw new Error('userId is required')

  const whereClause = { changedById: userId }
  if (revisionTable) {
    whereClause.revisionTable = Array.isArray(revisionTable) ? { [Op.in]: revisionTable } : revisionTable
  }

  const totalCount = await ActivityLog.count({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationPartnershipRevision,
        as: 'providerAccreditationPartnershipRevision',
        required: false,
        include: [
          {
            model: ProviderAccreditation,
            as: 'providerAccreditation',
            include: [{ model: Provider, as: 'provider' }]
          },
          { model: Provider, as: 'partner' }
        ]
      },
      {
        model: UserRevision,
        as: 'userRevision',
        required: false
      }
    ]
  })

  return totalCount
}

/**
 * Builds a structured summary for a given revision, including activity label, link and changed fields.
 *
 * @async
 * @param {Object} options
 * @param {Object|null} options.revision - The revision object.
 * @param {string} options.revisionTable - Name of the revision table.
 * @param {string} options.action - Type of action (e.g. 'create', 'update', 'delete').
 * @param {string} options.revisionId - ID of the revision.
 * @param {string} options.entityId - ID of the provider or user (or partnership for partnership logs).
 * @returns {Promise<{
 *   action: string,
 *   activity: string,
 *   label: string,
 *   href: string,
 *   fields: Array<{ key: string, value: string, href?: string }>,
 *   // extra, case-specific structured data for views/partials:
 *   links?: { accreditedProvider?: string, trainingProvider?: string },
 *   labelHtml?: string,
 *   // partnership case only:
 *   linkedAccreditations?: Array<{ id: string, number: string, startsOn: string|null, endsOn: string|null }>,
 *   accreditationsAdded?: Array<{ id: string, number: string, startsOn: string|null, endsOn: string|null }>,
 *   accreditationsRemoved?: Array<{ id: string, number: string, startsOn: string|null, endsOn: string|null }>,
 *   parties?: {
 *     accredited: { text: string, href: string, html: string },
 *     training:   { text: string, href: string, html: string }
 *   }
 * }>}
 */
const getRevisionSummary = async ({ revision, revisionTable, ...log }) => {
  if (!revision) {
    return { label: 'Revision details unavailable', fields: [] }
  }

  const action = log.action
  let activity = ''
  let label = ''
  let href = ''
  const fields = []

  // OPTIONAL extras (only set in certain cases)
  let labelHtml = ''
  let links = null
  let linkedAccreditations = []
  let accreditationsAdded = []
  let accreditationsRemoved = []
  let parties = null

  switch (revisionTable) {
    case 'provider_revisions': {
      const previousRevision = await getPreviousRevision({
        revisionTable,
        revisionId: log.revisionId,
        entityId: log.entityId
      })

      if (log.action === 'update') {
        if (revision.archivedAt) {
          activity = 'Provider archived'
        } else if (previousRevision?.archivedAt) {
          activity = 'Provider restored'
        } else {
          activity = 'Provider updated'
        }
      } else {
        const actionLabel = { create: 'created', delete: 'deleted' }[log.action] || `${log.action}d`
        activity = `Provider ${actionLabel}`
      }

      const { text, href: safeHref } = await buildProviderLink(revision.providerId, revision.operatingName || revision.name)
      label = text
      href = safeHref

      fields.push({ key: 'Provider type', value: getProviderTypeLabel(revision.type) })
      fields.push({ key: 'Operating name', value: revision.operatingName })
      fields.push({ key: 'Legal name', value: revision.legalName })
      fields.push({ key: 'UK provider reference number (UKPRN)', value: revision.ukprn })
      fields.push({ key: 'Unique reference number (URN)', value: revision.urn })
      fields.push({ key: 'Provider code', value: revision.code })
      break
    }

    case 'provider_address_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      const { href: safeHref } = await buildProviderLink(revision.providerId, providerName)
      activity = `Provider address ${log.action}d`
      label = providerName
      href = safeHref ? `${safeHref}/addresses` : ''

      fields.push({ key: 'Address line 1', value: revision.line1 })
      fields.push({ key: 'Address line 2', value: revision.line2 })
      fields.push({ key: 'Address line 3', value: revision.line3 })
      fields.push({ key: 'Town or city', value: revision.town })
      fields.push({ key: 'County', value: revision.county })
      fields.push({ key: 'Postcode', value: revision.postcode })
      fields.push({ key: 'Latitude', value: revision.latitude })
      fields.push({ key: 'Longitude', value: revision.longitude })
      break
    }

    case 'provider_contact_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      const { href: safeHref } = await buildProviderLink(revision.providerId, providerName)
      activity = `Provider contact ${log.action}d`
      label = providerName
      href = safeHref ? `${safeHref}/contacts` : ''

      fields.push({ key: 'First name', value: revision.firstName })
      fields.push({ key: 'Last name', value: revision.lastName })
      fields.push({ key: 'Email address', value: revision.email })
      fields.push({ key: 'Telephone', value: revision.telephone })
      break
    }

    case 'provider_accreditation_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      const { href: safeHref } = await buildProviderLink(revision.providerId, providerName)
      activity = `Provider accreditation ${log.action}d`
      label = providerName
      href = safeHref ? `${safeHref}/accreditations` : ''

      fields.push({ key: 'Accreditation number', value: revision.number })
      fields.push({ key: 'Date accreditation starts', value: govukDate(revision.startsOn) })
      fields.push({ key: 'Date accreditation ends', value: revision.endsOn ? govukDate(revision.endsOn) : null })
      break
    }

    // case 'provider_accreditation_partnership_revisions': {
    //   const accreditedProvider = revision.providerAccreditation?.provider || null
    //   const trainingProvider   = revision.partner || null

    //   const accreditedName = accreditedProvider?.operatingName || accreditedProvider?.legalName || 'Accredited provider'
    //   const trainingName   = trainingProvider?.operatingName || trainingProvider?.legalName || 'Training partner'

    //   const accreditedProviderId = accreditedProvider?.id || revision.providerAccreditation?.providerId
    //   const trainingProviderId   = trainingProvider?.id || revision.partnerId

    //   const { text: accreditedText, href: accreditedHref, html: accreditedHtml } =
    //     await buildProviderLink(accreditedProviderId, accreditedName)
    //   const { text: trainingText, href: trainingHref, html: trainingHtml } =
    //     await buildProviderLink(trainingProviderId, trainingName)

    //   label = `${accreditedText} – ${trainingText}`
    //   const labelHtml = `${accreditedHtml} – ${trainingHtml}`

    //   const href = accreditedHref ? `${accreditedHref}/partnerships` : ''

    //   // --- Snapshots ---
    //   const sequelize = require('../models').sequelize
    //   const asOf = new Date(log.changedAt)

    //   // Current snapshot (as of this activity)
    //   const nowLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getLinkedAccreditationsAsOf({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf
    //       })
    //     : []

    //   // Previous snapshot using the epsilon wrapper
    //   const prevLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getPrevLinkedAccreditations({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf,
    //         epsilonMs: 2000   // <- can omit; defaults to 2000
    //       })
    //     : []

    //   // Diffs (by accreditation id)
    //   const prevIds = new Set(prevLinked.map(a => a.id))
    //   const nowIds  = new Set(nowLinked.map(a => a.id))
    //   const added   = nowLinked.filter(a => !prevIds.has(a.id)).map(a => a.number).sort()
    //   const removed = prevLinked.filter(a => !nowIds.has(a.id)).map(a => a.number).sort()

    //   // ---- Activity label (order matters) ----
    //   if (nowLinked.length === 0) {
    //     activity = 'Provider partnership deleted'
    //   } else if (prevLinked.length === 0 && log.action === 'create') {
    //     // first ever link for this provider pair
    //     activity = 'Provider partnership created'
    //   } else if (added.length || removed.length || (log.action === 'create' && prevLinked.length > 0)) {
    //     // adding a *new* join row after an existing one(s)
    //     activity = 'Provider partnership accreditations updated'
    //   } else {
    //     activity = 'Provider partnership updated'
    //   }

    //   // Fields
    //   fields.push({ key: 'Accredited provider', value: accreditedText, href: accreditedHref })
    //   fields.push({ key: 'Training partner',    value: trainingText,   href: trainingHref  })
    //   fields.push({
    //     key: 'Linked accreditations',
    //     value: nowLinked.length ? nowLinked.map(a => a.number).sort().join(', ') : 'None'
    //   })
    //   if (added.length) fields.push({ key: 'Accreditations added', value: added.join(', ') })
    //   if (removed.length) fields.push({ key: 'Accreditations removed', value: removed.join(', ') })

    //   return {
    //     action: log.action,
    //     activity,
    //     label,
    //     labelHtml,
    //     href,
    //     links: { accreditedProvider: accreditedHref, trainingProvider: trainingHref },
    //     fields
    //   }
    // }

    // case 'provider_accreditation_partnership_revisions': {
    //   const accreditedProvider = revision.providerAccreditation?.provider || null
    //   const trainingProvider   = revision.partner || null

    //   const accreditedName = accreditedProvider?.operatingName || accreditedProvider?.legalName || 'Accredited provider'
    //   const trainingName   = trainingProvider?.operatingName   || trainingProvider?.legalName   || 'Training partner'

    //   const accreditedProviderId = accreditedProvider?.id || revision.providerAccreditation?.providerId
    //   const trainingProviderId   = trainingProvider?.id   || revision.partnerId

    //   const { text: accreditedText, href: accreditedHref } =
    //     await buildProviderLink(accreditedProviderId, accreditedName)
    //   const { text: trainingText, href: trainingHref } =
    //     await buildProviderLink(trainingProviderId, trainingName)

    //   label = `${accreditedText} – ${trainingText}`
    //   href = accreditedHref ? `${accreditedHref}/partnerships` : ''

    //   // --- Snapshots (as-of + previous) ---
    //   const sequelize = require('../models').sequelize
    //   const asOf = new Date(log.changedAt)

    //   const nowLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getLinkedAccreditationsAsOf({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf
    //       })
    //     : []

    //   const prevLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getPrevLinkedAccreditations({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf,           // epsilon defaults to 2000ms inside helper
    //       })
    //     : []

    //   // --- Diff (by accreditation id) ---
    //   const prevById = new Map(prevLinked.map(a => [a.id, a]))
    //   const nowById  = new Map(nowLinked.map(a => [a.id, a]))
    //   const addedObjs   = nowLinked.filter(a => !prevById.has(a.id))
    //   const removedObjs = prevLinked.filter(a => !nowById.has(a.id))

    //   // --- Activity label (order matters) ---
    //   if (nowLinked.length === 0) {
    //     activity = 'Provider partnership deleted'
    //   } else if (prevLinked.length === 0 && log.action === 'create') {
    //     activity = 'Provider partnership created'
    //   } else if (addedObjs.length || removedObjs.length || (log.action === 'create' && prevLinked.length > 0)) {
    //     activity = 'Provider partnership accreditations updated'
    //   } else {
    //     activity = 'Provider partnership updated'
    //   }

    //   // --- Helpers for date rendering ---
    //   const describe = (a) => {
    //     const startStr = a.startsOn ? govukDate(a.startsOn) : 'No start date'
    //     const endStr   = a.endsOn   ? govukDate(a.endsOn)   : 'No end date'
    //     return `${a.number} (${startStr} – ${endStr})`
    //   }

    //   // --- Fields (include dates) ---
    //   fields.push({ key: 'Accredited provider', value: accreditedText, href: accreditedHref })
    //   fields.push({ key: 'Training partner',    value: trainingText,   href: trainingHref  })

    //   fields.push({
    //     key: 'Linked accreditations',
    //     value: nowLinked.length ? nowLinked.map(describe).sort().join(', ') : 'None'
    //   })

    //   if (addedObjs.length) {
    //     fields.push({
    //       key: 'Accreditations added',
    //       value: addedObjs.map(describe).sort().join(', ')
    //     })
    //   }

    //   if (removedObjs.length) {
    //     fields.push({
    //       key: 'Accreditations removed',
    //       value: removedObjs.map(describe).sort().join(', ')
    //     })
    //   }

    //   break
    // }

    // case 'provider_accreditation_partnership_revisions': {
    //   const accreditedProvider = revision.providerAccreditation?.provider || null
    //   const trainingProvider   = revision.partner || null

    //   const accreditedName = accreditedProvider?.operatingName || accreditedProvider?.legalName || 'Accredited provider'
    //   const trainingName   = trainingProvider?.operatingName   || trainingProvider?.legalName   || 'Training partner'

    //   const accreditedProviderId = accreditedProvider?.id || revision.providerAccreditation?.providerId
    //   const trainingProviderId   = trainingProvider?.id   || revision.partnerId

    //   const { text: accreditedText, href: accreditedHref, html: accreditedHtml } =
    //     await buildProviderLink(accreditedProviderId, accreditedName)
    //   const { text: trainingText, href: trainingHref, html: trainingHtml } =
    //     await buildProviderLink(trainingProviderId, trainingName)

    //   label = `${accreditedText} – ${trainingText}`
    //   labelHtml = `${accreditedHtml} – ${trainingHtml}`
    //   href = accreditedHref ? `${accreditedHref}/partnerships` : ''

    //   // --- Snapshot the state at the time of this log, and just before it
    //   const sequelize = require('../models').sequelize
    //   const asOf = new Date(log.changedAt)

    //   const nowLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getLinkedAccreditationsAsOf({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf
    //       })
    //     : []

    //   const prevLinked = (accreditedProviderId && trainingProviderId)
    //     ? await getPrevLinkedAccreditations({
    //         sequelize,
    //         accreditedProviderId,
    //         partnerId: trainingProviderId,
    //         asOf
    //       })
    //     : []

    //   // --- Diff (by accreditation id) -> keep full objects (id, number, startsOn, endsOn)
    //   const prevById = new Map(prevLinked.map(a => [a.id, a]))
    //   const nowById  = new Map(nowLinked.map(a => [a.id, a]))

    //   accreditationsAdded   = nowLinked.filter(a => !prevById.has(a.id))
    //   accreditationsRemoved = prevLinked.filter(a => !nowById.has(a.id))
    //   linkedAccreditations  = nowLinked

    //   // --- Activity label
    //   if (nowLinked.length === 0) {
    //     activity = 'Provider partnership deleted'
    //   } else if (prevLinked.length === 0 && log.action === 'create') {
    //     activity = 'Provider partnership created'
    //   } else if (accreditationsAdded.length || accreditationsRemoved.length || (log.action === 'create' && prevLinked.length > 0)) {
    //     activity = 'Provider partnership accreditations updated'
    //   } else {
    //     activity = 'Provider partnership updated'
    //   }

    //   // --- Fields: keep providers; don’t format accreditation lists (view will render raw arrays)
    //   fields.push({ key: 'Accredited provider', value: accreditedText, href: accreditedHref })
    //   fields.push({ key: 'Training partner',    value: trainingText,   href: trainingHref  })

    //   // Optional: small counts so index tables stay informative without formatting dates
    //   fields.push({ key: 'Linked accreditations (count)', value: String(linkedAccreditations.length) })
    //   if (accreditationsAdded.length)   fields.push({ key: 'Accreditations added (count)',   value: String(accreditationsAdded.length) })
    //   if (accreditationsRemoved.length) fields.push({ key: 'Accreditations removed (count)', value: String(accreditationsRemoved.length) })

    //   // Extras for consumers that want direct links / html
    //   links = { accreditedProvider: accreditedHref, trainingProvider: trainingHref }
    //   parties = {
    //     accredited: { text: accreditedText, href: accreditedHref, html: accreditedHtml },
    //     training:   { text: trainingText,   href: trainingHref,   html: trainingHtml }
    //   }

    //   break
    // }

    case 'provider_accreditation_partnership_revisions': {
      const accreditedProvider = revision.providerAccreditation?.provider || null
      const trainingProvider   = revision.partner || null

      const accreditedName = accreditedProvider?.operatingName || accreditedProvider?.legalName || 'Accredited provider'
      const trainingName   = trainingProvider?.operatingName   || trainingProvider?.legalName   || 'Training partner'

      const accreditedProviderId = accreditedProvider?.id || revision.providerAccreditation?.providerId
      const trainingProviderId   = trainingProvider?.id   || revision.partnerId

      // Base provider links (to provider root)
      const { text: accreditedText, href: accreditedHrefBase, html: accreditedHtml } =
        await buildProviderLink(accreditedProviderId, accreditedName)
      const { text: trainingText, href: trainingHrefBase, html: trainingHtml } =
        await buildProviderLink(trainingProviderId, trainingName)

      // Force both links to their /partnerships sections
      const accreditedHref = appendSection(accreditedHrefBase, 'partnerships')
      const trainingHref   = appendSection(trainingHrefBase, 'partnerships')

      label = `${accreditedText} – ${trainingText}`
      labelHtml = accreditedHtml && trainingHtml
        ? `${accreditedHref ? `<a class="govuk-link" href="${accreditedHref}">${escapeHtml(accreditedText)}</a>` : escapeHtml(accreditedText)} – ${
            trainingHref ? `<a class="govuk-link" href="${trainingHref}">${escapeHtml(trainingText)}</a>` : escapeHtml(trainingText)
          }`
        : `${escapeHtml(accreditedText)} – ${escapeHtml(trainingText)}`
      href = accreditedHref // primary row click → accredited provider’s partnerships

      // --- Snapshots at/just-before this log’s timestamp (raw data with dates) ---
      const sequelize = require('../models').sequelize
      const asOf = new Date(log.changedAt)

      const nowLinked = (accreditedProviderId && trainingProviderId)
        ? await getLinkedAccreditationsAsOf({
            sequelize,
            accreditedProviderId,
            partnerId: trainingProviderId,
            asOf
          })
        : []

      const prevLinked = (accreditedProviderId && trainingProviderId)
        ? await getPrevLinkedAccreditations({
            sequelize,
            accreditedProviderId,
            partnerId: trainingProviderId,
            asOf
          })
        : []

      // Diff on accreditation id — keep FULL objects (id, number, startsOn, endsOn)
      const prevById = new Map(prevLinked.map(a => [a.id, a]))
      const nowById  = new Map(nowLinked.map(a => [a.id, a]))
      accreditationsAdded   = nowLinked.filter(a => !prevById.has(a.id))
      accreditationsRemoved = prevLinked.filter(a => !nowById.has(a.id))
      linkedAccreditations  = nowLinked

      // Activity label
      if (nowLinked.length === 0) {
        activity = 'Provider partnership deleted'
      } else if (prevLinked.length === 0 && log.action === 'create') {
        activity = 'Provider partnership created'
      } else if (accreditationsAdded.length || accreditationsRemoved.length || (log.action === 'create' && prevLinked.length > 0)) {
        activity = 'Provider partnership accreditations updated'
      } else {
        activity = 'Provider partnership updated'
      }

      // Fields: keep simple; dates are deliberately left for the view via structured arrays
      fields.push({ key: 'Accredited provider', value: accreditedText, href: accreditedHref })
      fields.push({ key: 'Training partner',    value: trainingText,   href: trainingHref  })
      fields.push({ key: 'Linked accreditations (count)', value: String(linkedAccreditations.length) })
      if (accreditationsAdded.length)   fields.push({ key: 'Accreditations added (count)',   value: String(accreditationsAdded.length) })
      if (accreditationsRemoved.length) fields.push({ key: 'Accreditations removed (count)', value: String(accreditationsRemoved.length) })

      // expose structured links if your unified return spreads them
      links = { accreditedProvider: accreditedHref, trainingProvider: trainingHref }
      parties = {
        accredited: { text: accreditedText, href: accreditedHref, html: accreditedHtml },
        training:   { text: trainingText,   href: trainingHref,   html: trainingHtml }
      }

      break
    }

    case 'user_revisions': {
      activity = `User ${log.action}d`

      // Prefer a proper name, otherwise email, then a generic fallback.
      const fallbackName =
        [revision.firstName, revision.lastName].filter(Boolean).join(' ').trim() ||
        revision.email ||
        'User'

      // Conditionally link if the user is listable; otherwise plain text.
      const { text: userText, href: userHref } = await buildUserLink(revision.userId, fallbackName)

      label = userText
      href = userHref

      fields.push({ key: 'First name', value: revision.firstName })
      fields.push({ key: 'Last name', value: revision.lastName })
      fields.push({ key: 'Email address', value: revision.email })
      break
    }

    default:
      label = 'Unknown revision'
  }


  return {
    action,
    activity,
    label,
    href,
    fields,
    ...(labelHtml && { labelHtml }),
    ...(links && { links }),
    ...(linkedAccreditations.length || accreditationsAdded.length || accreditationsRemoved.length
        ? { linkedAccreditations, accreditationsAdded, accreditationsRemoved }
        : {}),
    ...(parties && { parties })
  }
}

/**
 * Returns the previous revision for a given entity (based on revisionNumber ordering).
 *
 * @async
 * @param {Object} options
 * @param {string} options.revisionTable - Name of the revision table.
 * @param {string} options.revisionId - ID of the current revision.
 * @param {string} options.entityId - ID of the associated entity.
 * @returns {Promise<Object|null>} The previous revision or null if none exists.
 */
const getPreviousRevision = async ({ revisionTable, revisionId, entityId }) => {
  const revisionModel = getRevisionModel(revisionTable)
  if (!revisionModel) throw new Error(`Unknown revision table: ${revisionTable}`)

  const entityKeys = getEntityKeys(revisionTable)
  const whereClause = { [Op.or]: entityKeys.map(key => ({ [key]: entityId })) }

  const revisions = await revisionModel.findAll({
    where: whereClause,
    order: [['revisionNumber', 'ASC']]
  })

  const index = revisions.findIndex(r => r.id === revisionId)
  return index > 0 ? revisions[index - 1] : null
}

/**
 * Returns the most recent revision for a given entity in the specified revision table.
 *
 * @async
 * @param {Object} options
 * @param {string} options.revisionTable - Name of the revision table.
 * @param {string} options.entityId - ID of the associated entity.
 * @returns {Promise<Object|null>} The latest revision or null if none exists.
 */
const getLatestRevision = async ({ revisionTable, entityId }) => {
  const revisionModel = getRevisionModel(revisionTable)
  if (!revisionModel) throw new Error(`Unknown revision table: ${revisionTable}`)

  const entityKeys = getEntityKeys(revisionTable)
  const whereClause = { [Op.or]: entityKeys.map(key => ({ [key]: entityId })) }

  return revisionModel.findOne({
    where: whereClause,
    order: [['revisionNumber', 'DESC']]
  })
}

/**
 * Groups formatted activity logs by date.
 *
 * @param {Object[]} logs - Array of formatted activity log entries.
 * @returns {Object[]} An array of groups with { label, entries }.
 */
const groupActivityLogsByDate = (logs) => {
  const groups = {}

  for (const log of logs) {
    const date = new Date(log.changedAt)

    let label
    if (isToday(date)) {
      label = 'Today'
    } else if (isYesterday(date)) {
      label = 'Yesterday'
    } else {
      label = govukDate(date)
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(log)
  }

  // Convert to array in descending order of date
  return Object.entries(groups)
    .map(([label, entries]) => ({ label, entries }))
    .sort((a, b) => new Date(b.entries[0].changedAt) - new Date(a.entries[0].changedAt))
}

/**
 * Fetch the accreditations that link an accredited provider to a training partner
 * as of a specific timestamp. Uses `paranoid:false` to evaluate historical state.
 *
 * @param {Object} params
 * @param {import('sequelize').Sequelize} params.sequelize
 * @param {string} params.accreditedProviderId
 * @param {string} params.partnerId
 * @param {Date} params.asOf
 * @returns {Promise<LinkedAccreditation[]>}
 */
const getLinkedAccreditationsAsOf = async ({ sequelize, accreditedProviderId, partnerId, asOf }) => {
  const joins = await ProviderAccreditationPartnership.findAll({
    paranoid: false,
    where: {
      partnerId,
      createdAt: { [Op.lte]: asOf },
      [Op.or]: [{ deletedAt: null }, { deletedAt: { [Op.gt]: asOf } }]
    },
    include: [{
      model: ProviderAccreditation,
      as: 'providerAccreditation',
      required: true,
      where: { providerId: accreditedProviderId },
      attributes: ['id', 'number', 'startsOn', 'endsOn']
    }],
    attributes: ['createdAt', 'deletedAt']
  })

  return joins.map(j => ({
    id: j.providerAccreditation.id,
    number: j.providerAccreditation.number,
    startsOn: j.providerAccreditation.startsOn || null,
    endsOn: j.providerAccreditation.endsOn || null
  }))
}

/**
 * Convenience wrapper to fetch the **previous** snapshot by stepping back `epsilonMs`
 * from `asOf`. Helpful with SQLite’s second-level timestamp precision.
 *
 * @param {Object} params
 * @param {import('sequelize').Sequelize} params.sequelize
 * @param {string} params.accreditedProviderId
 * @param {string} params.partnerId
 * @param {Date} params.asOf
 * @param {number} [params.epsilonMs=2000]
 * @returns {Promise<LinkedAccreditation[]>}
 */
const getPrevLinkedAccreditations = async ({
  sequelize,
  accreditedProviderId,
  partnerId,
  asOf,
  epsilonMs = 2000
}) => {
  const prevAsOf = new Date(asOf.getTime() - epsilonMs)
  return getLinkedAccreditationsAsOf({ sequelize, accreditedProviderId, partnerId, asOf: prevAsOf })
}

/**
 * Get the last update for a provider across:
 * - provider (itself)
 * - accreditations (owned by the provider)
 * - addresses (owned by the provider)
 * - contacts (owned by the provider)
 * - partnerships (either provider is the accrediting provider via its accreditations OR provider is the partner)
 *
 * Any action counts (create/update/delete/archive/restore/etc.).
 *
 * @param {string} providerId - UUID of the provider.
 * @param {object} [opts]
 * @param {object} [opts.transaction] - Optional Sequelize transaction.
 * @param {boolean} [opts.includeDeletedChildren=false] - Include soft-deleted children when gathering IDs.
 * @param {object} [opts.entityTypes] - Override entity_type strings used in activity_logs.
 * @returns {Promise<{
 *   changedAt: Date|null,
 *   changedByUser: { id: string, firstName?: string, lastName?: string, email?: string }|null,
 *   action: string|null,
 *   entityType?: string,
 *   entityId?: string,
 *   revisionTable?: string,
 *   revisionId?: string,
 *   revisionNumber?: number
 * }>}
 */
const getProviderLastUpdated = async (providerId, opts = {}) => {
  const {
    transaction,
    includeDeletedChildren = false,
    entityTypes = {
      provider: 'provider',
      accreditation: 'provider_accreditation',
      address: 'provider_address',
      contact: 'provider_contact',
      partnership: 'provider_accreditation_partnership'
    }
  } = opts

  // 1) Gather related IDs (optionally exclude soft-deleted)
  const childWhere = (extra = {}) =>
    includeDeletedChildren ? extra : { ...extra, deletedAt: null }

  const [accreditationRows, addressRows, contactRows] = await Promise.all([
    ProviderAccreditation.findAll({
      attributes: ['id'],
      where: childWhere({ providerId }),
      transaction
    }),
    ProviderAddress.findAll({
      attributes: ['id'],
      where: childWhere({ providerId }),
      transaction
    }),
    ProviderContact.findAll({
      attributes: ['id'],
      where: childWhere({ providerId }),
      transaction
    })
  ])

  const accreditationIds = accreditationRows.map(r => r.id)
  const addressIds = addressRows.map(r => r.id)
  const contactIds = contactRows.map(r => r.id)

  // Partnerships: either linked via the provider's accreditations OR as partnerId
  const partnershipWhere = includeDeletedChildren ? {} : { deletedAt: null }
  const partnershipOr = []
  if (accreditationIds.length) partnershipOr.push({ providerAccreditationId: { [Op.in]: accreditationIds } })
  partnershipOr.push({ partnerId: providerId })

  const partnershipRows = await ProviderAccreditationPartnership.findAll({
    attributes: ['id'],
    where: { ...partnershipWhere, [Op.or]: partnershipOr },
    transaction
  })
  const partnershipIds = partnershipRows.map(r => r.id)

  // 2) Pull the latest log per entity type (no action filter — any action counts)
  const latestFinds = await Promise.all([
    // provider itself
    ActivityLog.findOne({
      where: { entityType: entityTypes.provider, entityId: providerId },
      include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['changedAt', 'DESC']],
      transaction
    }),

    // accreditations
    accreditationIds.length
      ? ActivityLog.findOne({
          where: { entityType: entityTypes.accreditation, entityId: { [Op.in]: accreditationIds } },
          include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          order: [['changedAt', 'DESC']],
          transaction
        })
      : null,

    // addresses
    addressIds.length
      ? ActivityLog.findOne({
          where: { entityType: entityTypes.address, entityId: { [Op.in]: addressIds } },
          include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          order: [['changedAt', 'DESC']],
          transaction
        })
      : null,

    // contacts
    contactIds.length
      ? ActivityLog.findOne({
          where: { entityType: entityTypes.contact, entityId: { [Op.in]: contactIds } },
          include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          order: [['changedAt', 'DESC']],
          transaction
        })
      : null,

    // partnerships
    partnershipIds.length
      ? ActivityLog.findOne({
          where: { entityType: entityTypes.partnership, entityId: { [Op.in]: partnershipIds } },
          include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          order: [['changedAt', 'DESC']],
          transaction
        })
      : null
  ])

  // 3) Choose the most recent
  const candidates = latestFinds.filter(Boolean)
  if (!candidates.length) {
    return { changedAt: null, changedByUser: null, action: null }
  }
  candidates.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
  const log = candidates[0]

  return {
    changedAt: log.changedAt ?? null,
    changedByUser: log.changedByUser
      ? {
          id: log.changedByUser.id,
          firstName: log.changedByUser.firstName,
          lastName: log.changedByUser.lastName,
          email: log.changedByUser.email
        }
      : null,
    action: log.action ?? null,
    entityType: log.entityType,
    entityId: log.entityId,
    revisionTable: log.revisionTable,
    revisionId: log.revisionId,
    revisionNumber: log.revisionNumber
  }
}

module.exports = {
  getActivityLogs,
  getProviderActivityLogs,
  getProviderActivityTotalCount,
  getUserActivityLogs,
  getUserActivityTotalCount,
  getPreviousRevision,
  getLatestRevision,
  groupActivityLogsByDate,
  getLinkedAccreditationsAsOf,
  getPrevLinkedAccreditations,
  getProviderLastUpdated
}
