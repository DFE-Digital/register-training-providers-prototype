const { Op } = require('sequelize')

const { Provider } = require('../../models')

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 200

/**
 * Normalize provider model into API response shape.
 * @param {import('../../models').Provider} provider
 * @returns {object}
 */
const serializeProvider = (provider) => ({
  id: provider.id,
  operating_name: provider.operatingName,
  legal_name: provider.legalName,
  ukprn: provider.ukprn,
  urn: provider.urn,
  provider_code: provider.code,
  provider_type: provider.type,
  is_accredited: !!provider.isAccredited,
  created_at: provider.createdAt ? provider.createdAt.toISOString() : null,
  updated_at: provider.updatedAt ? provider.updatedAt.toISOString() : null,
  archived_at: provider.archivedAt ? provider.archivedAt.toISOString() : null
})

/**
 * Parse and validate a positive integer query parameter.
 * @param {string|undefined} value
 * @param {number} fallback default value when undefined
 * @param {number} [max] optional upper bound
 * @returns {{ value?: number, error?: string }}
 */
const parsePositiveInt = (value, fallback, max) => {
  if (value === undefined) return { value: fallback }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return { error: 'must be a positive integer' }
  }
  if (max && parsed > max) {
    return { error: `must be ${max} or less` }
  }
  return { value: parsed }
}

/**
 * Parse and validate an ISO8601 date/time for changed_since.
 * @param {string|undefined} value
 * @returns {{ date?: Date|null, error?: string }}
 */
const parseChangedSince = (value) => {
  if (!value) return { date: null }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { error: 'changed_since must be a valid ISO 8601 date/time' }
  }
  return { date }
}

/**
 * GET /providers
 * Returns paginated providers filtered by optional changed_since.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<import('express').Response|void>}
 */
exports.list = async (req, res) => {
  const pageResult = parsePositiveInt(req.query.page, DEFAULT_PAGE)
  if (pageResult.error) {
    return res.status(400).json({
      status: 400,
      title: 'Bad Request',
      details: `Invalid page: ${pageResult.error}`
    })
  }

  const perPageResult = parsePositiveInt(req.query.per_page, DEFAULT_PER_PAGE, MAX_PER_PAGE)
  if (perPageResult.error) {
    return res.status(400).json({
      status: 400,
      title: 'Bad Request',
      details: `Invalid per_page: ${perPageResult.error}`
    })
  }

  const changedSinceResult = parseChangedSince(req.query.changed_since)
  if (changedSinceResult.error) {
    return res.status(400).json({
      status: 400,
      title: 'Bad Request',
      details: changedSinceResult.error
    })
  }

  const page = pageResult.value
  const perPage = perPageResult.value
  const where = { deletedAt: null }

  if (changedSinceResult.date) {
    where.updatedAt = { [Op.gte]: changedSinceResult.date }
  }

  const offset = (page - 1) * perPage

  const { rows, count } = await Provider.findAndCountAll({
    where,
    order: [
      ['updatedAt', 'DESC'],
      ['id', 'ASC']
    ],
    limit: perPage,
    offset
  })

  const totalPages = Math.ceil(count / perPage)

  res.json({
    data: rows.map(serializeProvider),
    pagination: {
      page,
      per_page: perPage,
      total_count: count,
      total_pages: totalPages
    }
  })
}
