import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

import User from '../models/User.js';
import Profile from '../models/Profile.js';
import SubjectArea from '../models/SubjectArea.js';
import Appointment from '../models/Appointment.js';
import ResearchBlock from '../models/ResearchBlock.js';
import Material from '../models/Material.js';
import Submission from '../models/Submission.js';
import { ensureVectorSchema } from '../services/ragServices.js';

const models = [User, Profile, SubjectArea, Appointment, ResearchBlock, Material, Submission];

const databaseReady = (async () => {
  try {
    models.forEach((model) => model.init(sequelize));
    models.forEach((model) => {
      if (model.associate) model.associate(sequelize.models);
    });

    await sequelize.authenticate();
    await sequelize.sync();
    await ensureGuardianProfileFields();
    await ensureMaterialRagFields();
    if (sequelize.getDialect() === 'postgres') await ensureVectorSchema();
    await seedSubjectAreas();

    if (process.env.NODE_ENV !== 'production') {
      await seedUsers();
    }

    console.log(`✅ Banco de Dados conectado (${sequelize.getDialect()}) e sincronizado com sucesso!`);
  } catch (error) {
    console.error('❌ Erro crítico ao inicializar o banco de dados:', error);
    throw error;
  }
})();

async function ensureGuardianProfileFields() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('profiles');
  const additions = {
    guardian_name: { type: DataTypes.STRING(255), allowNull: true },
    guardian_phone: { type: DataTypes.STRING(50), allowNull: true },
    guardian_relationship: { type: DataTypes.STRING(80), allowNull: true },
  };
  for (const [name, definition] of Object.entries(additions)) {
    if (!columns[name]) await queryInterface.addColumn('profiles', name, definition);
  }
}

async function ensureMaterialRagFields() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('materials');
  const additions = {
    rag_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'NOT_INDEXED' },
    rag_error: { type: DataTypes.TEXT, allowNull: true },
    rag_chunks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  };
  for (const [name, definition] of Object.entries(additions)) {
    if (!columns[name]) await queryInterface.addColumn('materials', name, definition);
  }
}

async function seedSubjectAreas() {
  if ((await SubjectArea.count()) > 0) return;
  await SubjectArea.bulkCreate([
    { code: 'NATURAL_SCIENCES', name: 'Ciências da Natureza', color_hex: '#2E5A44' },
    { code: 'LANGUAGES', name: 'Linguagens', color_hex: '#1E3A5F' },
    { code: 'HUMAN_SCIENCES', name: 'Ciências Humanas', color_hex: '#A0522D' },
  ]);
  console.log('🌱 Áreas de conhecimento iniciais populadas com sucesso!');
}

async function seedUsers() {
  if ((await User.count()) > 0) return;

  const teacher = await User.create({ email: 'professora@example.com', password: 'professora123', role: 'TEACHER' });
  await Profile.create({ user_id: teacher.id, full_name: 'Professora Rhuanna Luna', phone: '81-99999-9999', special_needs_notes: null });

  const student = await User.create({ email: 'aluno@example.com', password: 'aluno123', role: 'STUDENT' });
  await Profile.create({ user_id: student.id, full_name: 'Luiz Silva', phone: '81-99999-9999', special_needs_notes: 'Observações de atendimento adaptado' });

  console.log('👩‍🏫 Usuários iniciais criados com sucesso! (troque as senhas de seed antes de publicar)');
}

export default databaseReady;
