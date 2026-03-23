module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'user_revisions'
    const temp = 'user_revisions_tmp'

    await queryInterface.createTable(temp, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false
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
        allowNull: true
      },
      last_signed_in_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('support', 'provider', 'api'),
        allowNull: false,
        defaultValue: 'support'
      }
    })

    await queryInterface.sequelize.query(`
      INSERT INTO ${temp} (
        id,
        user_id,
        first_name,
        last_name,
        email,
        password,
        is_active,
        revision_number,
        revision_at,
        revision_by_id,
        last_signed_in_at,
        type
      )
      SELECT
        id,
        user_id,
        first_name,
        last_name,
        email,
        password,
        is_active,
        revision_number,
        revision_at,
        revision_by_id,
        last_signed_in_at,
        type
      FROM ${table}
    `)

    await queryInterface.dropTable(table)
    await queryInterface.renameTable(temp, table)

    await queryInterface.addIndex(table, {
      name: 'user_revisions_user_id_revision_number_uq',
      fields: ['user_id', 'revision_number'],
      unique: true
    })

    await queryInterface.addIndex(table, {
      name: 'user_revisions_user_id_revision_at_idx',
      fields: ['user_id', 'revision_at']
    })

    await queryInterface.addIndex(table, {
      name: 'user_revisions_revision_by_id_idx',
      fields: ['revision_by_id']
    })

    await queryInterface.addIndex(table, {
      name: 'user_revisions_revision_at_idx',
      fields: ['revision_at']
    })
  },

  async down(queryInterface, Sequelize) {
    const table = 'user_revisions'
    const temp = 'user_revisions_tmp'

    await queryInterface.createTable(temp, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      revision_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      revision_by_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      last_signed_in_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('support', 'provider', 'api'),
        allowNull: false,
        defaultValue: 'support'
      }
    })

    await queryInterface.sequelize.query(`
      INSERT INTO ${temp} (
        id,
        user_id,
        first_name,
        last_name,
        email,
        password,
        is_active,
        revision_number,
        revision_at,
        revision_by_id,
        last_signed_in_at,
        type
      )
      SELECT
        id,
        user_id,
        first_name,
        last_name,
        email,
        password,
        is_active,
        revision_number,
        revision_at,
        revision_by_id,
        last_signed_in_at,
        type
      FROM ${table}
    `)

    await queryInterface.dropTable(table)
    await queryInterface.renameTable(temp, table)
  }
}
