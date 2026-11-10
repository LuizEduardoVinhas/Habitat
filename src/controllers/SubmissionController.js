import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Submission from '../models/Submission.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/uploads/submissions');
const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function validFileSignature(file) {
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(8);
    const read = fs.readSync(fd, head, 0, head.length, 0);
    if (file.mimetype === 'application/pdf') return head.subarray(0, 5).toString() === '%PDF-';
    if (file.mimetype === 'image/jpeg') return read >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (file.mimetype === 'image/png') return head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function discard(file) {
  if (file) fs.promises.unlink(file.path).catch((error) => {
    if (error.code !== 'ENOENT') console.error('Erro ao remover upload incompleto:', error);
  });
}

class SubmissionController {
  async store(req, res) {
    const file = req.file;
    try {
      if (!file) return res.status(400).json({ error: 'Selecione um PDF ou uma imagem JPG/PNG.' });
      if (!validFileSignature(file)) {
        discard(file);
        return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde ao formato informado.' });
      }

      const title = clean(req.body?.title, 160);
      if (title.length < 3) {
        discard(file);
        return res.status(400).json({ error: 'Informe um título com pelo menos 3 caracteres.' });
      }

      const originalFilename = String(file.originalname || 'material')
        .replace(/[\\/\u0000-\u001f]/g, '')
        .trim()
        .slice(0, 255) || 'material';
      const submission = await Submission.create({
        student_id: req.session.user.id,
        title,
        description: clean(req.body?.description, 3000),
        file_name: path.basename(file.filename),
        original_filename: originalFilename,
        mime_type: file.mimetype,
      });

      return res.status(201).json({ message: 'Material enviado para análise.', id: submission.id });
    } catch (error) {
      discard(file);
      console.error('Erro ao enviar material para análise:', error);
      return res.status(500).json({ error: 'Não foi possível enviar o material.' });
    }
  }

  async review(req, res) {
    try {
      const { id } = req.params;
      if (!UUID.test(id)) return res.status(404).json({ error: 'Envio não encontrado.' });
      const submission = await Submission.findByPk(id);
      if (!submission) return res.status(404).json({ error: 'Envio não encontrado.' });

      const response = String(req.body?.teacher_response || '').trim().slice(0, 4000);
      if (response.length < 2) return res.status(400).json({ error: 'Escreva uma resposta para o aluno.' });

      submission.teacher_id = req.session.user.id;
      submission.teacher_response = response;
      submission.status = 'REVIEWED';
      submission.reviewed_at = new Date();
      await submission.save();
      return res.status(200).json({ message: 'Análise enviada ao aluno.', id: submission.id, status: submission.status });
    } catch (error) {
      console.error('Erro ao salvar análise do material:', error);
      return res.status(500).json({ error: 'Não foi possível salvar a análise.' });
    }
  }

  async download(req, res, next) {
    try {
      const { id } = req.params;
      if (!UUID.test(id)) return res.status(404).render('error', { code: 404, message: 'Arquivo não encontrado.' });
      const submission = await Submission.findByPk(id);
      if (!submission) return res.status(404).render('error', { code: 404, message: 'Arquivo não encontrado.' });

      const user = req.session.user;
      if (user.role !== 'TEACHER' && submission.student_id !== user.id) {
        return res.status(404).render('error', { code: 404, message: 'Arquivo não encontrado.' });
      }

      const filename = path.basename(submission.file_name);
      const filePath = path.resolve(uploadDir, filename);
      if (!filePath.startsWith(`${uploadDir}${path.sep}`) || !fs.existsSync(filePath)) {
        return res.status(404).render('error', { code: 404, message: 'Arquivo não encontrado.' });
      }

      return res.download(filePath, submission.original_filename, (error) => {
        if (error && !res.headersSent) next(error);
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default new SubmissionController();
