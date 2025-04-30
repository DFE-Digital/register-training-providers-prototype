const { ProviderPartnership } = require('../models')

const hasPartnership = async (params) => {
  const partnershipCount = await ProviderPartnership.count({
    where: {
      accreditedProviderId: params.accreditedProviderId,
      trainingProviderId: params.trainingProviderId
    }
  })

  return !!partnershipCount
}

module.exports = {
  hasPartnership
}
