const { ProviderAccreditation } = require('../models')
const { Op } = require('sequelize')

const isAccreditedProvider = async (params) => {
  // set a date for use in determining if the provider is accredited
  const now = new Date()

  // find all valid accreditations for the provider
  const accreditationCount = await ProviderAccreditation.count({
    where: {
      providerId: params.providerId,
      startsOn: { [Op.lte]: now },
      [Op.or]: [
        { endsOn: null },
        { endsOn: { [Op.gte]: now } }
      ]
    }
  })

  // calculate if the provider is accredited
  const isAccredited = accreditationCount > 0 // true|false

  return isAccredited
}

module.exports = {
  isAccreditedProvider
}
