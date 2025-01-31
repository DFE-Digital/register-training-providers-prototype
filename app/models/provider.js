const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Provider extends Model {
    static associate(models) {
      Provider.hasMany(models.ProviderAccreditation, {
        foreignKey: 'provider_id',
        as: 'accreditations'
      })

      Provider.hasMany(models.ProviderAddress, {
        foreignKey: 'provider_id',
        as: 'addresses'
      })

      Provider.hasMany(models.ProviderContact, {
        foreignKey: 'provider_id',
        as: 'contacts'
      })

      Provider.hasMany(models.ProviderHistory, {
        foreignKey: 'provider_id',
        as: 'histories'
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

      Provider.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdByUser'
      })

      Provider.belongsTo(models.User, {
        foreignKey: 'updated_by_id',
        as: 'updatedByUser'
      })
    }
  }

  Provider.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
        type: DataTypes.ENUM('hei', 'scitt', 'school')
      },
      ukprn:  {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          // is: /^1\d{7}$/
        }
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
        field: 'updated_at'
      },
      updatedById: {
        type: DataTypes.UUID,
        field: 'updated_by_id'
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
