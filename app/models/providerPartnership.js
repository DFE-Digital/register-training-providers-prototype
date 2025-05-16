const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnership extends Model {
    static associate(models) {
      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'accreditedProviderId',
        as: 'accreditedProvider'
      })

      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'trainingProviderId',
        as: 'trainingProvider'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderPartnership.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      accreditedProviderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'accredited_provider_id'
      },
      trainingProviderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'training_provider_id'
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
      modelName: 'ProviderPartnership',
      tableName: 'provider_partnerships',
      timestamps: true
    }
  )

  const createRevisionHook = require('../hooks/revisionHook')

  ProviderPartnership.addHook('afterCreate', (instance, options) =>
    createRevisionHook({ revisionModelName: 'ProviderPartnershipRevision', modelKey: 'providerPartnership' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderPartnership.addHook('afterUpdate',
    createRevisionHook({ revisionModelName: 'ProviderPartnershipRevision', modelKey: 'providerPartnership' })
  )

  return ProviderPartnership
}
