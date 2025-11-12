const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnershipAcademicYear extends Model {
    /**
     * Wire up ProviderPartnershipAcademicYear associations.
     * @param {object} models
     */
    static associate(models) {
      /**
       * Relationship belongs to the **provider partnership**.
       * FK lives on ProviderPartnershipAcademicYear.partnershipId.
       */
      ProviderPartnershipAcademicYear.belongsTo(models.ProviderPartnership, {
        foreignKey: 'partnershipId',
        as: 'partnership'
      })

      /**
       * Partnership belongs to a specific **academic year**.
       * FK lives on ProviderPartnershipAcademicYear.academicYearId.
       */
      ProviderPartnershipAcademicYear.belongsTo(models.AcademicYear, {
        foreignKey: 'academicYearId',
        as: 'academicYear'
      })

      /**
       * Metadata: created by user.
       * FK lives on ProviderPartnershipAcademicYear.createdById.
       */
      ProviderPartnershipAcademicYear.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      /**
       * Metadata: updated by user.
       * FK lives on ProviderPartnershipAcademicYear.updatedById.
       */
      ProviderPartnershipAcademicYear.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderPartnershipAcademicYear.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      partnershipId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'partnership_id'
      },
      academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id'
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
        allowNull: true,
        field: 'deleted_at'
      },
      deletedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'deleted_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderPartnershipAcademicYear',
      tableName: 'provider_partnership_academic_years',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  ProviderPartnershipAcademicYear.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'ProviderPartnershipAcademicYearRevision', modelKey: 'providerPartnershipAcademicYear' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderPartnershipAcademicYear.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'ProviderPartnershipAcademicYearRevision', modelKey: 'providerPartnershipAcademicYear' })
  )

  return ProviderPartnershipAcademicYear
}
