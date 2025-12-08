const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ApiClientToken extends Model {
    static associate(models) {
      ApiClientToken.hasMany(models.ApiClientTokenRevision, {
        foreignKey: 'apiClientTokenId',
        as: 'revisions'
      })

      ApiClientToken.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ApiClientToken.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })

      ApiClientToken.belongsTo(models.User, {
        foreignKey: 'revokedById',
        as: 'revokedByUser'
      })

      ApiClientToken.belongsTo(models.User, {
        foreignKey: 'deletedById',
        as: 'deletedByUser'
      })
    }
  }

  ApiClientToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'client_name',
        validate: {
          notEmpty: true
        }
      },
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'token_hash',
        validate: {
          notEmpty: true
        }
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'revoked'),
        allowNull: false,
        validate: {
          isIn: [['active', 'expired', 'revoked']]
        }
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by_id'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      },
      updatedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'updated_by_id'
      },
      revokedAt: {
        type: DataTypes.DATE,
        field: 'revoked_at'
      },
      revokedById: {
        type: DataTypes.UUID,
        field: 'revoked_by_id'
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at'
      },
      deletedById: {
        type: DataTypes.UUID,
        field: 'deleted_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ApiClientToken',
      tableName: 'api_client_tokens',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  ApiClientToken.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'ApiClientTokenRevision', modelKey: 'apiClientToken' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ApiClientToken.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'ApiClientTokenRevision', modelKey: 'apiClientToken' })
  )

  return ApiClientToken
}
