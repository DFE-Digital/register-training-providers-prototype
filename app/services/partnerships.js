const { ProviderAccreditationPartnership } = require('../models')

const savePartnerships = async ({ accreditationIds, partnerId, userId }) => {
  const timestamp = new Date()

  const dataToCreate = accreditationIds.map(accreditationId => ({
    providerAccreditationId: accreditationId,
    partnerId,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId
  }))

  return ProviderAccreditationPartnership.bulkCreate(dataToCreate)
}

module.exports = {
  savePartnerships
}
