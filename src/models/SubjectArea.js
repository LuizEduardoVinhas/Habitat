import { DataTypes, Model } from 'sequelize';

class SubjectArea extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      color_hex: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    }, {
      sequelize,
      modelName: 'SubjectArea',
      tableName: 'subject_areas',
      timestamps: true,
    });
  }

  static associate(models) {
    SubjectArea.hasMany(models.Appointment, { foreignKey: 'subject_area_id', as: 'appointments' });
    SubjectArea.hasMany(models.Material, { foreignKey: 'subject_area_id', as: 'materials' });
  }
}

export default SubjectArea;
