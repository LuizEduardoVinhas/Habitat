import { DataTypes, Model } from 'sequelize';

class ResearchBlock extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      teacher_id: {
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
      reason: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: 'Pesquisa Científica UFPE',
      },
    }, {
      sequelize,
      modelName: 'ResearchBlock',
      tableName: 'research_blocks',
      timestamps: true,
    });
  }

  static associate(models) {
    ResearchBlock.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
  }
}

export default ResearchBlock;
