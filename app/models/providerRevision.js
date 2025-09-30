const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderRevision extends Model {
    static associate(models) {
      ProviderRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      operatingName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'operating_name',
        validate: {
          notEmpty: true
        }
      },
      legalName: {
        type: DataTypes.STRING,
        field: 'legal_name'
      },
      type: {
        type: DataTypes.ENUM('hei', 'other', 'school')
      },
      ukprn:  {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^1\d{7}$/
        }
      },
      urn:  {
        type: DataTypes.STRING,
        unique: true
      },
      code:  {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^[a-zA-Z0-9]{3}$/
        }
      },
      website: {
        type: DataTypes.STRING,
        validate: {
          isURL: true
        }
      },
      archivedAt: {
        type: DataTypes.DATE,
        field: 'archived_at'
      },
      archivedById: {
        type: DataTypes.UUID,
        field: 'archived_by_id'
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
      modelName: 'ProviderRevision',
      tableName: 'provider_revisions',
      timestamps: false
    }
  )

  const createActivityHook = require('../hooks/activityHook')

  ProviderRevision.addHook('afterCreate', (instance, options) =>
    createActivityHook({
      entityType: 'provider',
      revisionTable: 'provider_revisions',
      entityIdField: 'providerId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderRevision
}
