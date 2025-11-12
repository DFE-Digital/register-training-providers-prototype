const { ProviderAccreditationPartnership, ProviderPartnershipAcademicYear } = require('../models')

const saveAccreditationPartnerships = async ({ accreditationIds, partnerId, userId }) => {
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

const saveAcademicYearPartnerships = async ({ academicYearIds, partnershipId, userId }) => {
  const timestamp = new Date()

  const rows = academicYearIds.map(academicYearId => ({
    academicYearId,
    partnershipId,
    createdAt: timestamp,
    createdById: userId,
    updatedAt: timestamp,
    updatedById: userId
  }))

  return ProviderPartnershipAcademicYear.bulkCreate(rows, {
    individualHooks: true,
    returning: true
  })
}

module.exports = {
  saveAccreditationPartnerships,
  saveAcademicYearPartnerships
}
