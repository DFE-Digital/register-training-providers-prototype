const { Op, literal } = require('sequelize')
const { Provider, ProviderAccreditation, ProviderAccreditationPartnership } = require('../models')

/**
 * Determine whether a partnership already exists between an accrediting provider and a training provider.
 *
 * The check succeeds if there exists at least one **non-deleted** `ProviderAccreditationPartnership`
 * with `partnerId === trainingProviderId` whose joined `ProviderAccreditation` row has
 * `providerId === accreditedProviderId` (also **non-deleted**).
 *
 * Note:
 * - This checks for a partnership under **any** accreditation owned by the accrediting provider.
 * - If you need to limit to *active* accreditations, add date conditions using `startsOn`/`endsOn`.
 * - The models aren’t `paranoid`, so we explicitly filter `deletedAt: null`.
 *
 * @param {HasPartnershipParams} params - Identifiers for the provider pair.
 * @param {HasPartnershipOptions} [options] - Optional query options.
 * @returns {Promise<boolean>} Resolves `true` if a matching partnership exists; otherwise `false`.
 * @throws {Error} If `accreditedProviderId` or `trainingProviderId` is missing.
 *
 * @example
 * // Keep your existing route code:
 * const hasExistingPartnership = await hasPartnership(
 *   isAccredited
 *     ? { accreditedProviderId: providerId,        trainingProviderId: selectedProviderId }
 *     : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }
 * )
 */
const hasPartnership = async (
  { accreditedProviderId, trainingProviderId } = {},
  { transaction } = {}
) => {
  if (!accreditedProviderId) throw new Error('accreditedProviderId is required')
  if (!trainingProviderId) throw new Error('trainingProviderId is required')

  const existing = await ProviderAccreditationPartnership.findOne({
    where: {
      partnerId: trainingProviderId,
      // model isn't paranoid, so exclude soft-deleted rows explicitly
      deletedAt: null
    },
    include: [{
      model: ProviderAccreditation,
      as: 'providerAccreditation', // matches your association
      required: true,
      attributes: ['id'],
      where: {
        providerId: accreditedProviderId, // <-- THIS is the accrediting provider FK
        deletedAt: null
      }
    }],
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
 */
const hasLinkedPartnerships = async (accreditationId, { transaction } = {}) => {
  if (!accreditationId) {
    throw new Error('hasLinkedPartnerships: accreditationId is required')
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
  hasPartnership,
  hasLinkedPartnerships,
  getEligiblePartnerProviders
}
