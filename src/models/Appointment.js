import { DataTypes, Model } from 'sequelize';

class Appointment extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      subject_area_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',
      timestamps: true,
    });
  }

  static associate(models) {
    Appointment.belongsTo(models.User, { foreignKey: 'student_id', as: 'student' });
    Appointment.belongsTo(models.SubjectArea, { foreignKey: 'subject_area_id', as: 'subjectArea' });
  }
}

export default Appointment;
