const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Provider extends Model {
    static associate(models) {
      Provider.hasMany(models.Accreditation, {
        foreignKey: 'provider_id',
        as: 'accreditations'
      })

      Provider.hasMany(models.ProviderHistory, {
        foreignKey: 'provider_id',
        as: 'histories'
      })

      Provider.hasMany(models.ProviderContact, {
        foreignKey: 'provider_id',
        as: 'contacts'
      })

      Provider.belongsToMany(models.Provider, {
        through: models.ProviderPartnership,
        as: 'trainingPartnerships',
        foreignKey: 'training_provider_id',
        otherKey: 'accredited_provider_id'
      })

      Provider.belongsToMany(models.Provider, {
        through: models.ProviderPartnership,
        as: 'accreditedPartnerships',
        foreignKey: 'accredited_provider_id',
        otherKey: 'training_provider_id'
      })
    }
  }

  Provider.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      operating_name: {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true
        }
      },
      legal_name: {
        type: DataTypes.STRING
      },
      type: {
        type: DataTypes.ENUM('hei', 'scitt', 'school')
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
      website: {
        type: DataTypes.STRING,
        validate: {
          isURL: true
        }
      }
    },
    {
      sequelize,
      modelName: 'Provider',
      tableName: 'providers'
    }
  )

  return Provider
}
