const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('academic_years', null, { transaction })
      await queryInterface.bulkDelete('academic_year_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'academic_year'
      }, { transaction })

      const dataPath = path.join(__dirname, '/data/20251107142300-seed-academic-years.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const academicYears = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const academicYear of academicYears) {
        const academicYearId = academicYear.id
        const revisionNumber = 1

        // Prepare base fields for both insert and revision
        const baseFields = {
          id: academicYearId,
          code: academicYear.code,
          name: academicYear.name,
          starts_on: academicYear.startsOn,
          ends_on: academicYear.endsOn,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert academic year
        await queryInterface.bulkInsert('academic_years', [baseFields], { transaction })

        // 2. Insert revision using helper
        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'academic_year_revisions',
          entityId: academicYearId,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 3. Insert activity log using helper
        await createActivityLog({
          revisionTable: 'academic_year_revisions',
          revisionId,
          entityType: 'academic_year',
          entityId: academicYearId,
          revisionNumber,
          changedById: userId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Academic year seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'academic_year'
    })
    await queryInterface.bulkDelete('academic_year_revisions', null, {})
    await queryInterface.bulkDelete('academic_years', null, {})
  }
}
