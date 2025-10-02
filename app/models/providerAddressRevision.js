const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAddressRevision extends Model {
    static associate(models) {
      ProviderAddressRevision.belongsTo(models.ProviderAddress, {
        foreignKey: 'providerAddressId',
        as: 'providerAddress'
      })

      ProviderAddressRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAddressRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderAddressRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerAddressId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_address_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      uprn: {
        type: DataTypes.STRING
      },
      line1:  {
        type: DataTypes.STRING,
        field: 'line_1',
        validate: {
          notEmpty: true
        }
      },
      line2: {
        type: DataTypes.STRING,
        field: 'line_2'
      },
      line3: {
        type: DataTypes.STRING,
        field: 'line_3'
      },
      town:  {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true
        }
      },
      county: {
        type: DataTypes.STRING
      },
      postcode:  {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          is: /^(([A-Z]{1,2}[0-9][A-Z0-9]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) ?[0-9][A-Z]{2}|BFPO ?[0-9]{1,4}|(KY[0-9]|MSR|VG|AI)[ -]?[0-9]{4}|[A-Z]{2} ?[0-9]{2}|GE ?CX|GIR ?0A{2}|SAN ?TA1)$/
        }
      },
      latitude: {
        type: DataTypes.FLOAT
      },
      longitude: {
        type: DataTypes.FLOAT
      },
      googlePlaceId: {
        type: DataTypes.STRING,
        field: 'google_place_id'
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
      modelName: 'ProviderAddressRevision',
      tableName: 'provider_address_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  ProviderAddressRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'provider_address',
      revisionTable: 'provider_address_revisions',
      entityIdField: 'providerAddressId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderAddressRevision
}
