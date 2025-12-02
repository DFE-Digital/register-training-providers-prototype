const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAcademicYear extends Model {
    static associate(models) {
      ProviderAcademicYear.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAcademicYear.belongsTo(models.AcademicYear, {
        foreignKey: 'academicYearId',
        as: 'academicYear'
      })

      ProviderAcademicYear.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderAcademicYear.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderAcademicYear.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
        field: 'deleted_at'
      },
      deletedById: {
        type: DataTypes.UUID,
        field: 'deleted_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderAcademicYear',
      tableName: 'provider_academic_years',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  ProviderAcademicYear.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'ProviderAcademicYearRevision', modelKey: 'providerAcademicYear' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderAcademicYear.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'ProviderAcademicYearRevision', modelKey: 'providerAcademicYear' })
  )

  return ProviderAcademicYear
}
