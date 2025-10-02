const { ProviderAccreditationPartnership } = require('../models')

const savePartnerships = async ({ accreditationIds, partnerId, userId }) => {
  const timestamp = new Date()

  const rows = accreditationIds.map(accreditationId => ({
    providerAccreditationId: accreditationId,
    partnerId,
    createdAt: timestamp,
    createdById: userId,
    updatedAt: timestamp,
    updatedById: userId
  }))

  return ProviderAccreditationPartnership.bulkCreate(rows, {
    individualHooks: true,
    returning: true
  })
}

module.exports = {
  savePartnerships
}
