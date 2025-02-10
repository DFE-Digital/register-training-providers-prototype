const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Provider extends Model {
    static associate(models) {
      Provider.hasMany(models.ProviderAccreditation, {
        foreignKey: 'providerId',
        as: 'accreditations'
      })

      Provider.hasMany(models.ProviderAddress, {
        foreignKey: 'providerId',
        as: 'addresses'
      })

      Provider.hasMany(models.ProviderContact, {
        foreignKey: 'providerId',
        as: 'contacts'
      })

      Provider.hasMany(models.ProviderHistory, {
        foreignKey: 'providerId',
        as: 'histories'
      })

      Provider.belongsToMany(models.Provider, {
        through: models.ProviderPartnership,
        as: 'accreditedPartnerships',
        foreignKey: 'trainingProviderId',
        otherKey: 'accreditedProviderId'
      })

      Provider.belongsToMany(models.Provider, {
        through: models.ProviderPartnership,
        as: 'trainingPartnerships',
        foreignKey: 'accreditedProviderId',
        otherKey: 'trainingProviderId'
      })

      Provider.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      Provider.belongsTo(models.User, {
        foreignKey: 'updatedById',
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
      tableName: 'providers',
      timestamps: false
    }
  )

  return Provider
}
