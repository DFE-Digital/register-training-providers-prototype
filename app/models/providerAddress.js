const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAddress extends Model {
    static associate(models) {
      ProviderAddress.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })
    }
  }

  ProviderAddress.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      provider_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      address_1:  {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true
        }
      },
      address_2: {
        type: DataTypes.STRING
      },
      address_3: {
        type: DataTypes.STRING
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE
      },
      updated_by: {
        type: DataTypes.UUID
      }
    },
    {
      sequelize,
      modelName: 'ProviderAddress',
      tableName: 'provider_addresses'
    }
  )

  return ProviderAddress
}
