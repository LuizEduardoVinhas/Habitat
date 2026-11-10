import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import postgres from './src/config/database.js';
import User from './src/models/User.js';
import Profile from './src/models/Profile.js';
import SubjectArea from './src/models/SubjectArea.js';
import Appointment from './src/models/Appointment.js';
import ResearchBlock from './src/models/ResearchBlock.js';
import Material from './src/models/Material.js';

dotenv.config();

const sourcePath = fileURLToPath(new URL('./data/saas-teacher.sqlite', import.meta.url));
const tables = [
  { name: 'users', model: User },
  { name: 'subject_areas', model: SubjectArea },
  { name: 'profiles', model: Profile },
  { name: 'appointments', model: Appointment },
  { name: 'research_blocks', model: ResearchBlock },
  { name: 'materials', model: Material },
];

async function runMigration() {
  if (!process.env.DATABASE_URL || postgres.getDialect() !== 'postgres') {
    throw new Error('Configure DATABASE_URL com a conexão PostgreSQL de destino antes de migrar.');
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Banco SQLite de origem não encontrado: ${sourcePath}`);
  }

  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: sourcePath,
    logging: false,
  });

  try {
    for (const { model } of tables) model.init(postgres);
    for (const { model } of tables) {
      if (model.associate) model.associate(postgres.models);
    }

    console.log('Autenticando conexões de origem e destino...');
    await sqlite.authenticate();
    await postgres.authenticate();

    console.log('Criando tabelas ausentes no PostgreSQL sem apagar dados...');
    await postgres.sync();

    const destinationCounts = {};
    for (const { name, model } of tables) {
      destinationCounts[name] = await model.count();
    }
    const occupied = Object.entries(destinationCounts).filter(([, count]) => count > 0);
    if (occupied.length) {
      const summary = occupied.map(([table, count]) => `${table}: ${count}`).join(', ');
      throw new Error(`Migração cancelada: o destino já contém registros (${summary}). Nenhum registro foi alterado.`);
    }

    const sourceRows = {};
    for (const { name } of tables) {
      const [rows] = await sqlite.query(`SELECT * FROM "${name}"`);
      sourceRows[name] = rows;
    }

    const transaction = await postgres.transaction();
    try {
      for (const { name } of tables) {
        const rows = sourceRows[name];
        if (rows.length) {
          await postgres.getQueryInterface().bulkInsert(name, rows, { transaction });
        }
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    console.log('Migração concluída. Registros copiados:');
    for (const { name } of tables) {
      const migrated = await tables.find((table) => table.name === name).model.count();
      const expected = sourceRows[name].length;
      if (migrated !== expected) {
        throw new Error(`Verificação falhou para ${name}: esperados ${expected}, encontrados ${migrated}.`);
      }
      console.log(`  ${name}: ${migrated}`);
    }
  } finally {
    await sqlite.close();
    await postgres.close();
  }
}

runMigration().catch((error) => {
  console.error('Migração não concluída:', error.message);
  process.exitCode = 1;
});
