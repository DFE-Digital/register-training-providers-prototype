module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_client_token_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      api_client_token_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'api_client_tokens',
          key: 'id'
        }
      },
      client_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active','expired','revoked'),
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      revoked_at: {
        type: Sequelize.DATE
      },
      revoked_by_id: {
        type: Sequelize.UUID
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      revision_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      revision_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      }
    })

    await queryInterface.addIndex('api_client_token_revisions', {
      name: 'api_client_token_revisions_api_client_token_id_revision_number_uq',
      fields: ['api_client_token_id', 'revision_number'],
      unique: true
    })
    await queryInterface.addIndex('api_client_token_revisions', {
      name: 'api_client_token_revisions_api_client_token_id_revision_at_idx',
      fields: ['api_client_token_id', 'revision_at']
    })
    await queryInterface.addIndex('api_client_token_revisions', {
      name: 'api_client_token_revisions_revision_by_id_idx',
      fields: ['revision_by_id']
    })
    await queryInterface.addIndex('api_client_token_revisions', {
      name: 'api_client_token_revisions_revision_at_idx',
      fields: ['revision_at']
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_client_token_revisions')
  }
}
