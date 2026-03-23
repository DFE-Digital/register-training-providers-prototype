/**
 * Adds useful indexes to provider_user_revisions:
 *  - UNIQUE (provider_user_id, revision_number)
 *  - (provider_user_id, revision_at)
 *  - (revision_by_id)
 *  - (revision_at)
 */

const TABLE = 'provider_user_revisions'
const MODEL_ID = 'provider_user_id'

const ixName = (suffix) => `${TABLE}_${suffix}`

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(TABLE, {
      name: ixName(`${MODEL_ID}_revision_number_uq`),
      fields: [MODEL_ID, 'revision_number'],
      unique: true
    })

    await queryInterface.addIndex(TABLE, {
      name: ixName(`${MODEL_ID}_revision_at_idx`),
      fields: [MODEL_ID, 'revision_at']
    })

    await queryInterface.addIndex(TABLE, {
      name: ixName('revision_by_id_idx'),
      fields: ['revision_by_id']
    })

    await queryInterface.addIndex(TABLE, {
      name: ixName('revision_at_idx'),
      fields: ['revision_at']
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(TABLE, ixName('revision_at_idx'))
    await queryInterface.removeIndex(TABLE, ixName('revision_by_id_idx'))
    await queryInterface.removeIndex(TABLE, ixName(`${MODEL_ID}_revision_at_idx`))
    await queryInterface.removeIndex(TABLE, ixName(`${MODEL_ID}_revision_number_uq`))
  }
}
