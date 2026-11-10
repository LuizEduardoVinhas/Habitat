import User from '../models/User.js';
import Profile from '../models/Profile.js';

class SessionController {
  async register(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.full_name || '').replace(/\s+/g, ' ').trim().slice(0, 255);
    const guardianName = String(req.body?.guardian_name || '').replace(/\s+/g, ' ').trim().slice(0, 255);
    const guardianPhone = String(req.body?.guardian_phone || '').trim().slice(0, 50);
    const guardianRelationship = String(req.body?.guardian_relationship || '').replace(/\s+/g, ' ').trim().slice(0, 80);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido para o aluno.' });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'A senha deve ter entre 8 e 72 caracteres.' });
    }
    if (fullName.length < 2) return res.status(400).json({ error: 'Informe o nome completo do aluno.' });
    if (guardianName.length < 2) return res.status(400).json({ error: 'Informe o nome do responsável.' });
    if (guardianPhone.replace(/\D/g, '').length < 8) return res.status(400).json({ error: 'Informe um telefone válido do responsável.' });
    if (guardianRelationship.length < 2) return res.status(400).json({ error: 'Informe o vínculo do responsável com o aluno.' });

    let transaction;
    try {
      transaction = await User.sequelize.transaction();
      const user = await User.create({ email, password, role: 'STUDENT' }, { transaction });
      await Profile.create({
        user_id: user.id,
        full_name: fullName,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        guardian_relationship: guardianRelationship,
      }, { transaction });
      await transaction.commit();

      req.session.user = { id: user.id, email: user.email, role: user.role, full_name: fullName };
      return res.status(201).json({ message: 'Cadastro realizado com sucesso.', user: req.session.user });
    } catch (error) {
      if (transaction) await transaction.rollback();
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Este e-mail já possui cadastro. Entre na sua conta.' });
      }
      console.error('Erro no cadastro do aluno:', error);
      return res.status(500).json({ error: 'Não foi possível concluir o cadastro.' });
    }
  }

  // Login de usuário (STUDENT ou TEACHER)
  async login(req, res) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha não podem ser vazios.' });
      }

      const user = await User.findOne({
        where: { email },
        include: [{ model: Profile, as: 'profile' }],
      });

      // Mesma resposta para e-mail inexistente e senha errada (evita enumeração de contas)
      if (!user || !(await user.checkPassword(password))) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.profile ? user.profile.full_name : 'Usuário',
      };

      return res.status(200).json({ message: 'Login realizado com sucesso', user: req.session.user });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ error: 'Erro ao realizar login.' });
    }
  }

  // Logout: destrói a sessão e limpa o cookie da sessão (connect.sid)
  async logout(req, res) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Erro ao realizar logout.' });
      res.clearCookie('connect.sid').status(200).json({ message: 'Logout realizado com sucesso' });
    });
  }

  // Dados do usuário da sessão atual
  async show(req, res) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Não foi possível realizar a operação, por favor faça login.' });
    }
    return res.status(200).json(req.session.user);
  }
}

export default new SessionController();
