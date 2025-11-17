const { ProviderPartnershipAcademicYear } = require('../models')

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
  saveAcademicYearPartnerships
}
