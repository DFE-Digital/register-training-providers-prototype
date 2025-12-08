const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ApiClientTokenRevision extends Model {
    static associate(models) {
      ApiClientTokenRevision.belongsTo(models.ApiClientToken, {
        foreignKey: 'apiClientTokenId',
        as: 'apiClientToken'
      })

      ApiClientTokenRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })

      ApiClientTokenRevision.belongsTo(models.User, {
        foreignKey: 'revokedById',
        as: 'revokedByUser'
      })
    }
  }

  ApiClientTokenRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      apiClientTokenId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'api_client_token_id'
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'client_name',
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
      revokedAt: {
        type: DataTypes.DATE,
        field: 'revoked_at'
      },
      revokedById: {
        type: DataTypes.UUID,
        field: 'revoked_by_id'
      },
      revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'revision_number'
      },
      revisionAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'revision_at'
      },
      revisionById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'revision_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ApiClientTokenRevision',
      tableName: 'api_client_token_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  ApiClientTokenRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'api_client_token',
      revisionTable: 'api_client_token_revisions',
      entityIdField: 'apiClientTokenId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ApiClientTokenRevision
}
