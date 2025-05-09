const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditationRevision extends Model {
    static associate(models) {
      ProviderAccreditationRevision.belongsTo(models.ProviderAccreditation, {
        foreignKey: 'providerAccreditationId',
        as: 'providerAccreditation'
      })

      ProviderAccreditationRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAccreditationRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderAccreditationRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerAccreditationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_accreditation_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
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
      modelName: 'ProviderAccreditationRevision',
      tableName: 'provider_accreditation_revisions',
      timestamps: false
    }
  )

  const createActivityHook = require('../hooks/activityHook')

  ProviderAccreditationRevision.addHook('afterCreate', (instance, options) =>
    createActivityHook({
      entityType: 'provider_accreditation',
      revisionTable: 'provider_accreditation_revisions',
      entityIdField: 'providerAccreditationId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderAccreditationRevision
}
