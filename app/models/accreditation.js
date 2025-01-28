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
        primaryKey: true,
        autoIncrement: true
      },
      provider_id: {
        type: DataTypes.BIGINT,
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
      }
    },
    {
      sequelize,
      modelName: 'Accreditation',
      tableName: 'accreditation'
    }
  )

  return Accreditation
}
