import { DataTypes, Model } from 'sequelize';

class Material extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      subject_area_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      target_student_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      rag_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'NOT_INDEXED',
      },
      rag_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rag_chunks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    }, {
      sequelize,
      modelName: 'Material',
      tableName: 'materials',
      timestamps: true,
    });
  }

  static associate(models) {
    Material.belongsTo(models.SubjectArea, { foreignKey: 'subject_area_id', as: 'subjectArea' });
    Material.belongsTo(models.User, { foreignKey: 'target_student_id', as: 'targetStudent' });
  }
}

export default Material;
