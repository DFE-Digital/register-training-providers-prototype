const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderUserRevision extends Model {
    static associate(models) {
      ProviderUserRevision.belongsTo(models.ProviderUser, {
        foreignKey: 'providerUserId',
        as: 'providerUser'
      })

      ProviderUserRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderUserRevision.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      })

      ProviderUserRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderUserRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_user_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'is_active'
      },
      revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'revision_number'
      },
      revisionAt: {
        type: DataTypes.DATE,
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
      modelName: 'ProviderUserRevision',
      tableName: 'provider_user_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  ProviderUserRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'provider_user',
      revisionTable: 'provider_user_revisions',
      entityIdField: 'providerUserId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderUserRevision
}
