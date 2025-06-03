const { Provider, ProviderPartnership } = require('../models')

const { Op } = require('sequelize')

const hasPartnership = async (params) => {
  const partnershipCount = await ProviderPartnership.count({
    where: {
      accreditedProviderId: params.accreditedProviderId,
      trainingProviderId: params.trainingProviderId
    }
  })

  return !!partnershipCount
}

const getEligiblePartnerProviders = async (query, today = new Date()) => {
  const whereConditions = {
    archivedAt: null,
    deletedAt: null,
    [Op.or]: [
      { operatingName: { [Op.like]: `%${query}%` } },
      { legalName: { [Op.like]: `%${query}%` } },
      { ukprn: { [Op.like]: `%${query}%` } },
      { urn: { [Op.like]: `%${query}%` } }
    ]
  }

  return Provider.findAll({
    attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'urn'],
    where: whereConditions,
    include: [
      {
        model: ProviderAccreditation,
        as: 'accreditations',
        required: true,
        where: {
          startsOn: { [Op.lte]: today },
          [Op.or]: [
            { endsOn: null },
            { endsOn: { [Op.gte]: today } }
          ]
        }
      }
    ],
    order: [['operatingName', 'ASC']]
  })
}

module.exports = {
  hasPartnership,
  getEligiblePartnerProviders
}
