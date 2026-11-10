import { DataTypes, Model } from 'sequelize';

class Submission extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      teacher_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'REVIEWED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      teacher_response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      sequelize,
      modelName: 'Submission',
      tableName: 'submissions',
      timestamps: true,
    });
  }

  static associate(models) {
    Submission.belongsTo(models.User, { foreignKey: 'student_id', as: 'student' });
    Submission.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
  }
}

export default Submission;
