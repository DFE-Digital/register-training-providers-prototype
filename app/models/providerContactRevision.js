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
          is: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        }
      },
      telephone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^(?:(?:\(?(?:0(?:0|11)\)?[\s-]?\(?|\+)44\)?[\s-]?(?:\(?0\)?[\s-]?)?)|(?:\(?0))(?:(?:\d{5}\)?[\s-]?\d{4,5})|(?:\d{4}\)?[\s-]?(?:\d{5}|\d{3}[\s-]?\d{3}))|(?:\d{3}\)?[\s-]?\d{3}[\s-]?\d{3,4})|(?:\d{2}\)?[\s-]?\d{4}[\s-]?\d{4}))(?:[\s-]?(?:x|ext\.?|\#)\d{3,4})?$/
        }
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

  const activityHook = require('../hooks/activityHook')

  ProviderContactRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
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
