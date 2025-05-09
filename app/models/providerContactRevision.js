const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderContactRevision extends Model {
    static associate(models) {
      ProviderContactRevision.belongsTo(models.ProviderContact, {
        foreignKey: 'providerContactId',
        as: 'providerContact'
      })

      ProviderContactRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderContactRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderContactRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerContactId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_contact_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'first_name'
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'last_name'
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true
        }
      },
      telephone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^(\+44\s?|0)(?:\d\s?){9,10}$/
        }
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
      modelName: 'ProviderContactRevision',
      tableName: 'provider_contact_revisions',
      timestamps: false
    }
  )

  const createActivityHook = require('../hooks/activityHook')

  ProviderContactRevision.addHook('afterCreate', (instance, options) =>
    createActivityHook({
      entityType: 'provider_contact',
      revisionTable: 'provider_contact_revisions',
      entityIdField: 'providerContactId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderContactRevision
}
