const { Op, literal } = require('sequelize')
const { Provider, ProviderAccreditation, ProviderPartnership } = require('../models')

/**
 * Determine whether a partnership already exists between an accrediting provider and a training provider.
 *
 * The check succeeds if there exists at least one **non-deleted** `ProviderPartnership`
 * row whose `accreditedProviderId` and `trainingPartnerId` match the supplied identifiers.
 * Optionally, you can set `bidirectional: true` in the options to also treat the reversed pair
 * (training ↔ accredited) as a match. Use `overlapsWith: { startsOn, endsOn }` to only treat
 * existing partnerships as duplicates when their date range overlaps the supplied range.
 *
 * Models aren’t `paranoid`, so we explicitly filter `deletedAt: null`.
 *
 * @param {HasPartnershipParams} params - Identifiers for the provider pair.
 * @param {HasPartnershipOptions} [options] - Optional query options.
 * @returns {Promise<boolean>} Resolves `true` if a matching partnership exists; otherwise `false`.
 * @throws {Error} If `accreditedProviderId` or `trainingPartnerId` is missing.
 *
 * @example
 * // Keep your existing route code:
 * const hasExistingPartnership = await partnershipExistsForProviderPair(
 *   isAccredited
 *     ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
 *     : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }
 * )
 */
const partnershipExistsForProviderPair = async (
  { accreditedProviderId, trainingPartnerId } = {},
  { transaction, bidirectional = false, overlapsWith } = {}
) => {
  if (!accreditedProviderId) throw new Error('partnershipExistsForProviderPair: accreditedProviderId is required')
  if (!trainingPartnerId) throw new Error('partnershipExistsForProviderPair: trainingPartnerId is required')

  const clauses = [{
    accreditedProviderId,
    trainingPartnerId
  }]

  if (bidirectional && accreditedProviderId !== trainingPartnerId) {
    clauses.push({
      accreditedProviderId: trainingPartnerId,
      trainingPartnerId: accreditedProviderId
    })
  }

  const where = {
    deletedAt: null,
    [Op.or]: clauses
  }

  if (overlapsWith?.startsOn) {
    const overlapStart = new Date(overlapsWith.startsOn)
    if (Number.isNaN(overlapStart.getTime())) {
      throw new Error('partnershipExistsForProviderPair: overlapsWith.startsOn must be a valid date')
    }

    const overlapClauses = []

    if (overlapsWith.endsOn) {
      const overlapEnd = new Date(overlapsWith.endsOn)
      if (Number.isNaN(overlapEnd.getTime())) {
        throw new Error('partnershipExistsForProviderPair: overlapsWith.endsOn must be a valid date')
      }

      overlapClauses.push({ startsOn: { [Op.lte]: overlapEnd } })
    }

    overlapClauses.push({
      [Op.or]: [
        { endsOn: null },
        { endsOn: { [Op.gte]: overlapStart } }
      ]
    })

    where[Op.and] = where[Op.and] ? [...where[Op.and], ...overlapClauses] : overlapClauses
  }

  const existing = await ProviderPartnership.findOne({
    where,
    attributes: ['id'],
    transaction
  })

  return Boolean(existing)
}

/**
 * Get eligible partners for a provider, depending on whether they are accredited or not.
 *
 * @param {Object} options
 * @param {boolean} options.isAccredited - Whether the current provider is accredited.
 * @param {string} [options.query=''] - Search string to match against provider name, UKPRN or URN.
 * @param {Date} [options.today=new Date()] - Reference date (usually now).
 * @returns {Promise<Provider[]>}
 */
const getEligiblePartnerProviders = async ({ isAccredited, query = '', today = new Date() }) => {
  const baseWhere = {
    [Op.and]: [
      { archivedAt: null },
      { deletedAt: null },
      {
        [Op.or]: [
          { operatingName: { [Op.like]: `%${query}%` } },
          { legalName: { [Op.like]: `%${query}%` } },
          { ukprn: { [Op.like]: `%${query}%` } },
          { urn: { [Op.like]: `%${query}%` } }
        ]
      }
    ]
  }

  const accreditationWhere = {
    startsOn: { [Op.lte]: today },
    [Op.or]: [
      { endsOn: null },
      { endsOn: { [Op.gte]: today } }
    ]
  }

  if (isAccredited) {
    // Return training providers: those with no current accreditations
    return Provider.findAll({
      attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'urn'],
      where: baseWhere,
      include: [
        {
          model: ProviderAccreditation,
          as: 'accreditations',
          required: false,
          attributes: [],
          where: accreditationWhere
        }
      ],
      group: ['Provider.id'],
      having: literal('COUNT("accreditations"."id") = 0'),
      order: [['operatingName', 'ASC']]
    })
  } else {
    // Return accredited providers: those with valid accreditations
    return Provider.findAll({
      attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'urn'],
      where: baseWhere,
      include: [
        {
          model: ProviderAccreditation,
          as: 'accreditations',
          required: true,
          where: accreditationWhere
        }
      ],
      order: [['operatingName', 'ASC']]
    })
  }
}

module.exports = {
  getEligiblePartnerProviders,
  partnershipExistsForProviderPair
}
