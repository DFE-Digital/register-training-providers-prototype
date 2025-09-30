/**
 * Adds useful indexes to all *-revisions tables:
 *  - UNIQUE (model_id, revision_number)
 *  - (model_id, revision_at)
 *  - (revision_by_id)
 *  - (revision_at)
 */

const TABLES = [
  { table: 'provider_revisions', modelId: 'provider_id' },
  { table: 'provider_accreditation_revisions', modelId: 'provider_accreditation_id' },
  { table: 'provider_address_revisions', modelId: 'provider_address_id' },
  { table: 'provider_contact_revisions', modelId: 'provider_contact_id' },
  { table: 'provider_partnership_revisions', modelId: 'provider_partnership_id' },
  { table: 'provider_accreditation_partnership_revisions', modelId: 'provider_accreditation_partnership_id' },
  { table: 'user_revisions', modelId: 'user_id' }
]

// Helper to generate consistent index names
const ixName = (table, suffix) => {
  return `${table}_${suffix}`
}

module.exports = {
  async up (queryInterface, Sequelize) {
    for (const { table, modelId } of TABLES) {
      // 1) Unique (model_id, revision_number)
      await queryInterface.addIndex(table, {
        name: ixName(table, `${modelId}_revision_number_uq`),
        fields: [modelId, 'revision_number'],
        unique: true
      })

      // 2) (model_id, revision_at)
      await queryInterface.addIndex(table, {
        name: ixName(table, `${modelId}_revision_at_idx`),
        fields: [modelId, 'revision_at']
      })

      // 3) (revision_by_id)
      await queryInterface.addIndex(table, {
        name: ixName(table, `revision_by_id_idx`),
        fields: ['revision_by_id']
      })

      // 4) (revision_at)
      await queryInterface.addIndex(table, {
        name: ixName(table, `revision_at_idx`),
        fields: ['revision_at']
      })
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes in reverse order
    for (const { table, modelId } of [...TABLES].reverse()) {
      await queryInterface.removeIndex(table, ixName(table, `revision_at_idx`))
      await queryInterface.removeIndex(table, ixName(table, `revision_by_id_idx`))
      await queryInterface.removeIndex(table, ixName(table, `${modelId}_revision_at_idx`))
      await queryInterface.removeIndex(table, ixName(table, `${modelId}_revision_number_uq`))
    }
  }
}
