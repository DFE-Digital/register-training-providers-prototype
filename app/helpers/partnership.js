const { Op, literal } = require('sequelize')
const { Provider, ProviderAccreditation, ProviderAccreditationPartnership, ProviderPartnership } = require('../models')

/**
 * Determine whether a partnership already exists between an accrediting provider and a training provider.
 *
 * The check succeeds if there exists at least one **non-deleted** `ProviderPartnership`
 * row whose `accreditedProviderId` and `trainingProviderId` match the supplied identifiers.
 * Optionally, you can set `bidirectional: true` in the options to also treat the reversed pair
 * (training ↔ accredited) as a match.
 *
 * Models aren’t `paranoid`, so we explicitly filter `deletedAt: null`.
 *
 * @param {HasPartnershipParams} params - Identifiers for the provider pair.
 * @param {HasPartnershipOptions} [options] - Optional query options.
 * @returns {Promise<boolean>} Resolves `true` if a matching partnership exists; otherwise `false`.
 * @throws {Error} If `accreditedProviderId` or `trainingProviderId` is missing.
 *
 * @example
 * // Keep your existing route code:
 * const hasExistingPartnership = await partnershipExistsForProviderPair(
 *   isAccredited
 *     ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
 *     : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }
 * )
 */
const partnershipExistsForProviderPair = async (
  { accreditedProviderId, trainingProviderId } = {},
  { transaction, bidirectional = false } = {}
) => {
  if (!accreditedProviderId) throw new Error('partnershipExistsForProviderPair: accreditedProviderId is required')
  if (!trainingProviderId) throw new Error('partnershipExistsForProviderPair: trainingProviderId is required')

  const clauses = [{
    accreditedProviderId,
    trainingProviderId
  }]

  if (bidirectional && accreditedProviderId !== trainingProviderId) {
    clauses.push({
      accreditedProviderId: trainingProviderId,
      trainingProviderId: accreditedProviderId
    })
  }

  const existing = await ProviderPartnership.findOne({
    where: {
      deletedAt: null,
      [Op.or]: clauses
    },
    attributes: ['id'],
    transaction
  })

  return Boolean(existing)
}

/**
 * Determine whether a ProviderAccreditation has any linked partnerships.
 *
 * Checks for at least one non-deleted row in `provider_accreditation_partnerships`
 * with `providerAccreditationId === accreditationId`.
 *
 * Models are not `paranoid`, so we explicitly filter `deletedAt: null`.
 *
 * @param {string} accreditationId - UUID from `provider_accreditations.id`.
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 * @returns {Promise<boolean>} True if one or more partnerships exist; otherwise false.
 * @throws {Error} If `accreditationId` is missing.
 */
const partnershipsExistForAccreditation = async (accreditationId, { transaction } = {}) => {
  if (!accreditationId) {
    throw new Error('partnershipsExistForAccreditation: accreditationId is required')
  }

  const existing = await ProviderAccreditationPartnership.findOne({
    where: {
      providerAccreditationId: accreditationId,
      // model isn't paranoid, so exclude soft-deleted rows explicitly
      deletedAt: null
    },
    attributes: ['id'],
    transaction
  })

  return Boolean(existing)
}


/**
 * Get the number of (non-deleted) partnerships linked to a ProviderAccreditation.
 *
 * Counts rows in `provider_accreditation_partnerships` where
 * `providerAccreditationId === accreditationId`. By default this excludes
 * soft-deleted rows (`deletedAt IS NULL`) since the model is not `paranoid`.
 *
 * @param {string} accreditationId
 *   UUID from `provider_accreditations.id`.
 * @param {{
 *   transaction?: import('sequelize').Transaction,
 *   includeDeleted?: boolean
 * }} [options]
 *   Optional Sequelize options:
 *   - transaction: pass an existing transaction.
 *   - includeDeleted: set true to include soft-deleted partnerships.
 *
 * @returns {Promise<number>} Number of partnerships for the accreditation.
 *
 * @example
 * const count = await getPartnershipCountForAccreditation(accreditation.id, { transaction })
 * if (count > 0) {
 *   // Block deletion or adapt UI
 * }
 */
const getPartnershipCountForAccreditation = async (
  accreditationId,
  { transaction, includeDeleted = false } = {}
) => {
  if (!accreditationId) {
    throw new Error('getPartnershipCountForAccreditation: accreditationId is required')
  }

  const where = { providerAccreditationId: accreditationId }
  if (!includeDeleted) where.deletedAt = null

  return ProviderAccreditationPartnership.count({ where, transaction })
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
  getPartnershipCountForAccreditation,
  partnershipExistsForProviderPair,
  partnershipsExistForAccreditation
}
