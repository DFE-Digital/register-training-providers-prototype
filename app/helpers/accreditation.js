const { Op } = require('sequelize')
const { Provider, ProviderAccreditation } = require('../models')

/**
 * Determines whether a provider is currently an accredited provider.
 *
 * A provider is considered accredited if their stored `is_accredited` flag is true.
 * This flag is kept up to date by background refreshes and accreditation updates.
 *
 * @async
 * @function isAccreditedProvider
 * @param {Object} params - Parameters for checking accreditation status.
 * @param {string} params.providerId - The ID of the provider to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the provider is currently accredited, otherwise `false`.
 */
const isAccreditedProvider = async (params) => {
  const provider = await Provider.findByPk(params.providerId)
  return !!provider?.isAccredited
}

/**
 * Get details for a list of accreditation IDs.
 * @param {Array<string>} accreditationIds - Array of accreditation UUIDs
 * @returns {Promise<Array<Object>>} Array of ProviderAccreditation objects
 */
const getAccreditationDetails = async (accreditationIds) => {
  if (!Array.isArray(accreditationIds) || accreditationIds.length === 0) {
    return []
  }

  const accreditations = await ProviderAccreditation.findAll({
    where: {
      id: {
        [Op.in]: accreditationIds
      }
    }
  })

  return accreditations.map(accreditation => accreditation.toJSON())
}

module.exports = {
  isAccreditedProvider,
  getAccreditationDetails
}
