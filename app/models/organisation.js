const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Organisation extends Model {
    /**
    * Helper method for defining associations.
    * This method is not a part of Sequelize lifecycle.
    * The `models/index` file will call this method automatically.
    */
   static associate(models) {
     // define association here
   }
  }

  Organisation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      organisation_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      organisation_type: {
        type: DataTypes.STRING,
        allowNull: false
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
      modelName: 'Organisation',
      tableName: 'organisations'
    }
  )

  return Organisation
}
