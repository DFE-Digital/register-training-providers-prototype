const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditationPartnershipRevision extends Model {
    static associate(models) {
      ProviderAccreditationPartnershipRevision.belongsTo(models.ProviderAccreditation, {
        foreignKey: 'providerAccreditationId',
        as: 'providerAccreditation'
      })

      ProviderAccreditationPartnershipRevision.belongsTo(models.Provider, {
        foreignKey: 'partnerId',
        as: 'partner'
      })

      ProviderAccreditationPartnershipRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderAccreditationPartnershipRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerAccreditationPartnershipId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_accreditation_partnership_id'
      },
      providerAccreditationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_accreditation_id'
      },
      partnerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'partner_id'
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
      modelName: 'ProviderAccreditationPartnershipRevision',
      tableName: 'provider_accreditation_partnership_revisions',
      timestamps: false
    }
  )

  const createActivityHook = require('../hooks/activityHook')

  ProviderAccreditationPartnershipRevision.addHook('afterCreate', (instance, options) =>
    createActivityHook({
      entityType: 'provider_accreditation_partnership',
      revisionTable: 'provider_accreditation_partnership_revisions',
      entityIdField: 'providerAccreditationPartnershipId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderAccreditationPartnershipRevision
}
