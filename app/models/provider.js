const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Provider extends Model {
    /**
     * Wire up Provider associations.
     * @param {object} models
     */
    static associate(models) {
      /**
       * One provider → many ProviderRevision rows (revision history).
       * FK lives on ProviderRevision.providerId.
       */
      Provider.hasMany(models.ProviderRevision, {
        foreignKey: 'providerId',
        as: 'revisions'
      })

      /**
       * One provider (the accredited provider) → many ProviderAccreditation rows.
       * FK lives on ProviderAccreditation.providerId.
       */
      Provider.hasMany(models.ProviderAccreditation, {
        foreignKey: 'providerId',
        as: 'accreditations'
      })

      /**
       * One provider → many ProviderAddress rows.
       * FK lives on ProviderAddress.providerId.
       */
      Provider.hasMany(models.ProviderAddress, {
        foreignKey: 'providerId',
        as: 'addresses'
      })

      /**
       * One provider → many ProviderContact rows.
       * FK lives on ProviderContact.providerId.
       */
      Provider.hasMany(models.ProviderContact, {
        foreignKey: 'providerId',
        as: 'contacts'
      })

      /**
       * One provider (as the **training** partner) → many ProviderAccreditationPartnership rows.
       * FK lives on ProviderAccreditationPartnership.partnerId (this provider is the training provider).
       *
       * To reach the accredited provider:
       *   this Provider
       *     → (hasMany) accreditedPartnerships
       *     → (belongsTo) providerAccreditation
       *     → (belongsTo) provider  // the **accredited** provider
       */
      Provider.hasMany(models.ProviderAccreditationPartnership, {
        foreignKey: 'partnerId',
        as: 'accreditedPartnerships'
      })

      /**
       * Provider was created by a User.
       * FK lives on Provider.createdById.
       */
      Provider.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      /**
       * Provider was last updated by a User.
       * FK lives on Provider.updatedById.
       */
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

  const createRevisionHook = require('../hooks/revisionHook')

  Provider.addHook('afterCreate', (instance, options) =>
    createRevisionHook({ revisionModelName: 'ProviderRevision', modelKey: 'provider' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  Provider.addHook('afterUpdate',
    createRevisionHook({ revisionModelName: 'ProviderRevision', modelKey: 'provider' })
  )

  return Provider
}
