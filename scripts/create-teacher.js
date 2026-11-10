import { createInterface as createPrompt } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';
import databaseReady from '../src/database/index.js';
import User from '../src/models/User.js';
import Profile from '../src/models/Profile.js';

function ask(question) {
  const prompt = createPrompt({ input: stdin, output: stdout });
  return prompt.question(question).finally(() => prompt.close());
}

function askHidden(question) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Execute este comando em um terminal interativo.'));
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.removeListener('keypress', onKeypress);
      stdin.setRawMode(false);
      stdout.write('\n');
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Operação cancelada.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
      } else if (key.name === 'backspace') {
        value = Array.from(value).slice(0, -1).join('');
      } else if (!key.ctrl && !key.meta && character) {
        value += character;
      }
    };

    emitKeypressEvents(stdin);
    stdin.on('keypress', onKeypress);
  });
}

async function createTeacher() {
  const email = String(process.argv[2] || await ask('E-mail da professora: '))
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Informe um e-mail válido.');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Este e-mail já está cadastrado. Nenhuma conta foi alterada.');
  }

  const fullName = String(await ask('Nome completo [Professora Rhuanna Luna]: ')).trim()
    || 'Professora Rhuanna Luna';
  const password = await askHidden('Nova senha (8 a 72 caracteres; entrada oculta): ');
  if (password.length < 8 || password.length > 72) {
    throw new Error('A senha deve ter entre 8 e 72 caracteres.');
  }
  const confirmation = await askHidden('Confirme a nova senha: ');
  if (password !== confirmation) {
    throw new Error('As senhas não coincidem.');
  }

  const transaction = await User.sequelize.transaction();
  try {
    const user = await User.create({ email, password, role: 'TEACHER' }, { transaction });
    await Profile.create({
      user_id: user.id,
      full_name: fullName,
    }, { transaction });
    await transaction.commit();
    stdout.write(`Conta da professora criada para ${email}. Você já pode entrar no Habitat.\n`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

try {
  await databaseReady;
  await createTeacher();
} catch (error) {
  console.error(`Não foi possível criar a conta: ${error.message}`);
  process.exitCode = 1;
} finally {
  await User.sequelize?.close();
}
