const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Accreditation extends Model {
    static associate(models) {
      Accreditation.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })
    }
  }

  Accreditation.init(
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
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      starts_on: {
        type: DataTypes.DATE,
        allowNull: false
      },
      ends_on: {
        type: DataTypes.DATE
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
      modelName: 'Accreditation',
      tableName: 'accreditations'
    }
  )

  return Accreditation
}
