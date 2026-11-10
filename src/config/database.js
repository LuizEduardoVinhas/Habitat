import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const commonOptions = {
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false,
  },
};

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
databaseUrl?.searchParams.delete('sslmode');

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl.toString(), {
    ...commonOptions,
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: true,
      },
    },
  })
  : new Sequelize({
    ...commonOptions,
    dialect: 'sqlite',
    storage: 'data/saas-teacher.sqlite',
  });

export default sequelize;
