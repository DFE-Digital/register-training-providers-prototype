const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('provider_academic_years', null, { transaction })
      await queryInterface.bulkDelete('provider_academic_year_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_academic_year'
      }, { transaction })

      const dataPath = path.join(__dirname, '/data/20260217144420-seed-provider-academic-years.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerAcademicYears = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const providerAcademicYear of providerAcademicYears) {
        const providerAcademicYearId = providerAcademicYear.id
        const revisionNumber = 1

        const baseFields = {
          id: providerAcademicYearId,
          provider_id: providerAcademicYear.providerId,
          academic_year_id: providerAcademicYear.academicYearId,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        await queryInterface.bulkInsert('provider_academic_years', [baseFields], { transaction })

        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'provider_academic_year_revisions',
          entityId: providerAcademicYearId,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        await createActivityLog({
          revisionTable: 'provider_academic_year_revisions',
          revisionId,
          entityType: 'provider_academic_year',
          entityId: providerAcademicYearId,
          revisionNumber,
          changedById: userId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider academic year seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_academic_year'
    })
    await queryInterface.bulkDelete('provider_academic_year_revisions', null, {})
    await queryInterface.bulkDelete('provider_academic_years', null, {})
  }
}
