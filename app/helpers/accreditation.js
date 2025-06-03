const { Op } = require('sequelize')
const { ProviderAccreditation } = require('../models')

/**
 * Determines whether a provider is currently an accredited provider.
 *
 * A provider is considered accredited if they have at least one valid accreditation
 * where the `startsOn` date is in the past (or today), and the `endsOn` date is either
 * in the future (or today) or not set.
 *
 * @async
 * @function isAccreditedProvider
 * @param {Object} params - Parameters for checking accreditation status.
 * @param {string} params.providerId - The ID of the provider to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the provider is currently accredited, otherwise `false`.
 */
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
