const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnershipAcademicYearRevision extends Model {
    static associate(models) {
      ProviderPartnershipAcademicYearRevision.belongsTo(models.ProviderPartnership, {
        foreignKey: 'partnershipId',
        as: 'providerPartnership'
      })

      ProviderPartnershipAcademicYearRevision.belongsTo(models.AcademicYear, {
        foreignKey: 'academicYearId',
        as: 'academicYear'
      })

      ProviderPartnershipAcademicYearRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderPartnershipAcademicYearRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerPartnershipAcademicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_partnership_academic_year_id'
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
      revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'revision_number'
      },
      revisionAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'revision_at'
      },
      revisionById: {
        type: DataTypes.UUID,
        field: 'revision_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderPartnershipAcademicYearRevision',
      tableName: 'provider_partnership_academic_year_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  ProviderPartnershipAcademicYearRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'provider_partnership_academic_year',
      revisionTable: 'provider_partnership_academic_year_revisions',
      entityIdField: 'providerPartnershipAcademicYearId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderPartnershipAcademicYearRevision
}
