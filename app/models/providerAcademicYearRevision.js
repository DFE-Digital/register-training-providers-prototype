const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAcademicYearRevision extends Model {
    static associate(models) {
      ProviderAcademicYearRevision.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAcademicYearRevision.belongsTo(models.AcademicYear, {
        foreignKey: 'academicYearId',
        as: 'academicYear'
      })

      ProviderAcademicYearRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  ProviderAcademicYearRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerAcademicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_academic_year_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
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
      modelName: 'ProviderAcademicYearRevision',
      tableName: 'provider_academic_year_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  ProviderAcademicYearRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'provider_academic_year',
      revisionTable: 'provider_academic_year_revisions',
      entityIdField: 'providerAcademicYearId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return ProviderAcademicYearRevision
}
