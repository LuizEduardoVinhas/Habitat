import bcrypt from 'bcryptjs';
import { DataTypes, Model } from 'sequelize';

class User extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('STUDENT', 'TEACHER'),
        allowNull: false,
        defaultValue: 'STUDENT',
      },
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
      },
    });
  }

  static associate(models) {
    User.hasOne(models.Profile, { foreignKey: 'user_id', as: 'profile' });
    User.hasMany(models.Appointment, { foreignKey: 'student_id', as: 'appointments' });
    User.hasMany(models.ResearchBlock, { foreignKey: 'teacher_id', as: 'researchBlocks' });
    User.hasMany(models.Material, { foreignKey: 'target_student_id', as: 'targetedMaterials' });
  }

  async checkPassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

export default User;
