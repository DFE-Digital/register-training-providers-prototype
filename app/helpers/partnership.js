const { Op, literal } = require('sequelize')
const { Provider, ProviderAccreditation,ProviderPartnership } = require('../models')

/**
 * Checks whether a partnership exists between an accredited provider
 * and a training provider.
 *
 * @async
 * @function hasPartnership
 * @param {Object} params - The parameters for the partnership check.
 * @param {string} params.accreditedProviderId - The ID of the accredited provider.
 * @param {string} params.trainingProviderId - The ID of the training provider.
 * @returns {Promise<boolean>} A promise that resolves to `true` if a partnership exists, `false` otherwise.
 */
const hasPartnership = async (params) => {
  const partnershipCount = await ProviderPartnership.count({
    where: {
      accreditedProviderId: params.accreditedProviderId,
      trainingProviderId: params.trainingProviderId,
      deletedAt: null
    }
  })

  return !!partnershipCount
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
  getEligiblePartnerProviders
}
