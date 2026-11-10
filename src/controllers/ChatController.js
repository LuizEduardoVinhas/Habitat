import { perguntarAoAgente } from '../services/ragServices.js';

class ChatController {
  async ask(req, res) {
    const question = String(req.body?.question || '').trim();
    if (question.length < 2) {
      return res.status(400).json({ error: 'Escreva uma pergunta com pelo menos 2 caracteres.' });
    }
    if (question.length > 1200) {
      return res.status(400).json({ error: 'A pergunta deve ter no máximo 1200 caracteres.' });
    }

    try {
      const result = await perguntarAoAgente(question, req.session.user.id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao responder pergunta do aluno:', error);
      return res.status(503).json({
        error: error.message || 'O assistente não conseguiu responder agora. Tente novamente mais tarde.',
      });
    }
  }
}

export default new ChatController();
