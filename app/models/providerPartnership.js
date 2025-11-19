const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnership extends Model {
    static associate(models) {
      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'training_partner_id',
        as: 'trainingPartner'
      })

      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'accredited_provider_id',
        as: 'accreditedProvider'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdByUser'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'updated_by_id',
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
      trainingPartnerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'training_partner_id'
      },
      startsOn: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'starts_on'
      },
      endsOn: {
        type: DataTypes.DATE,
        field: 'ends_on'
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

  const revisionHook = require('../hooks/revisionHook')

  ProviderPartnership.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'ProviderPartnershipRevision', modelKey: 'providerPartnership' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderPartnership.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'ProviderPartnershipRevision', modelKey: 'providerPartnership' })
  )

  return ProviderPartnership
}
