import { DataTypes, Model } from 'sequelize';

class Profile extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      guardian_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      guardian_phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      guardian_relationship: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      special_needs_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      modelName: 'Profile',
      tableName: 'profiles',
      timestamps: true,
    });
  }

  static associate(models) {
    Profile.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export default Profile;
