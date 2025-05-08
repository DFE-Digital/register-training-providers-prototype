const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Provider extends Model {
    static associate(models) {
      Provider.hasMany(models.ProviderRevision, {
        foreignKey: 'providerId',
        as: 'revisions'
      })

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
      archivedAt: {
        type: DataTypes.DATE,
        field: 'archived_at'
      },
      archivedById: {
        type: DataTypes.UUID,
        field: 'archived_by_id'
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at'
      },
      deletedById: {
        type: DataTypes.UUID,
        field: 'deleted_by_id'
      }
    },
    {
      sequelize,
      modelName: 'Provider',
      tableName: 'providers',
      timestamps: true
    }
  )

  const createRevision = async (provider) => {
    const revisionData = {
      ...provider.get({ plain: true }),
      providerId: provider.id,
      revisionById: provider.updatedById || provider.createdById || null
    }

    delete revisionData.id // ensure a new UUID is used
    await sequelize.models.ProviderRevision.create(revisionData)
  }

  Provider.addHook('afterCreate', createRevision)
  Provider.addHook('afterUpdate', createRevision)

  return Provider
}
