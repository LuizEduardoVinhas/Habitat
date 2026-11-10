import ResearchBlock from '../models/ResearchBlock.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MS = 31 * 24 * 60 * 60 * 1000;

class ResearchBlockController {
  // POST /admin/research-blocks — cadastra um bloqueio de pesquisa na UFPE
  async store(req, res) {
    try {
      const start = new Date(req.body?.start_time);
      const end = new Date(req.body?.end_time);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Informe o início e o término do bloqueio.' });
      }
      if (end <= start) return res.status(400).json({ error: 'O término precisa ser depois do início.' });
      if (end - start > MAX_MS) return res.status(400).json({ error: 'Um bloqueio pode durar no máximo 31 dias.' });

      const reason = String(req.body?.reason || '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Pesquisa Científica UFPE';
      const block = await ResearchBlock.create({
        teacher_id: req.session.user.id,
        start_time: start,
        end_time: end,
        reason,
      });
      return res.status(201).json({ message: 'Bloqueio salvo.', id: block.id });
    } catch (error) {
      console.error('Erro ao salvar bloqueio:', error);
      return res.status(500).json({ error: 'Não foi possível salvar o bloqueio.' });
    }
  }

  // DELETE /admin/research-blocks/:id — libera o horário novamente
  async destroy(req, res) {
    try {
      if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
      const block = await ResearchBlock.findByPk(req.params.id);
      if (!block) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
      await block.destroy();
      return res.status(200).json({ message: 'Bloqueio excluído.' });
    } catch (error) {
      console.error('Erro ao excluir bloqueio:', error);
      return res.status(500).json({ error: 'Não foi possível excluir o bloqueio.' });
    }
  }
}

export default new ResearchBlockController();
