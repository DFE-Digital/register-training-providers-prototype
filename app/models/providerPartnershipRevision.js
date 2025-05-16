const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnershipRevision extends Model {
    static associate(models) {
      ProviderPartnershipRevision.belongsTo(models.Provider, {
        foreignKey: 'accreditedProviderId',
        as: 'accreditedProvider'
      })

      ProviderPartnershipRevision.belongsTo(models.Provider, {
        foreignKey: 'trainingProviderId',
        as: 'trainingProvider'
      })

      ProviderPartnershipRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderPartnershipRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerPartnershipId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_partnership_id'
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
        field: 'revision_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderPartnershipRevision',
      tableName: 'provider_partnership_revisions',
      timestamps: false
    }
  )

  const createActivityHook = require('../hooks/activityHook')

  ProviderPartnershipRevision.addHook('afterCreate', (instance, options) =>
    createActivityHook({
      entityType: 'provider_partnership',
      revisionTable: 'provider_partnership_revisions',
      entityIdField: 'providerPartnershipId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderPartnershipRevision
}
