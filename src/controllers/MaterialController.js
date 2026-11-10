import fs from 'fs';
import Material from '../models/Material.js';
import SubjectArea from '../models/SubjectArea.js';
import User from '../models/User.js';
import { processarESalvarPDF } from '../services/ragServices.js';
import path from 'path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const discard = (file) => file && fs.unlink(file.path, () => {});
const uploadDir = path.resolve('public/uploads/materials');

async function indexMaterial(material) {
  material.rag_status = 'PROCESSING';
  material.rag_error = null;
  await material.save();
  try {
    const result = await processarESalvarPDF(path.resolve(uploadDir, path.basename(material.file_url)), {
      materialId: material.id,
      title: material.title,
      subjectAreaId: material.subject_area_id,
      targetStudentId: material.target_student_id,
    });
    material.rag_status = 'INDEXED';
    material.rag_chunks = result.indexedChunks;
    material.rag_error = null;
    await material.save();
    return result;
  } catch (error) {
    material.rag_status = 'FAILED';
    material.rag_error = String(error.message || 'Falha ao indexar material.').slice(0, 1000);
    await material.save();
    throw error;
  }
}

class MaterialController {
  // POST /admin/materials — upload multipart (campo "file") de PDF/resumo
  async store(req, res) {
    const file = req.file;
    try {
      if (!file) return res.status(400).json({ error: 'Selecione um PDF para publicar.' });
      const head = Buffer.alloc(5);
      const fd = fs.openSync(file.path, 'r');
      fs.readSync(fd, head, 0, 5, 0);
      fs.closeSync(fd);
      if (head.toString() !== '%PDF-') { discard(file); return res.status(400).json({ error: 'O arquivo enviado não é um PDF válido.' }); }

      const title = String(req.body?.title || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const description = String(req.body?.description || '').trim().slice(0, 4000);
      if (title.length < 3) { discard(file); return res.status(400).json({ error: 'Informe um título para o material.' }); }

      const areaId = String(req.body?.subject_area_id || '');
      if (!UUID.test(areaId) || !(await SubjectArea.findByPk(areaId))) { discard(file); return res.status(400).json({ error: 'Escolha a área do conhecimento.' }); }

      let target = null;
      if (req.body?.target_student_id) {
        const tid = String(req.body.target_student_id);
        const student = UUID.test(tid) ? await User.findOne({ where: { id: tid, role: 'STUDENT' } }) : null;
        if (!student) { discard(file); return res.status(400).json({ error: 'Aluno destinatário não encontrado.' }); }
        target = student.id;
      }

      const material = await Material.create({
        subject_area_id: areaId,
        title,
        description,
        file_url: `/uploads/materials/${file.filename}`,
        target_student_id: target,
        rag_status: 'PROCESSING',
      });
      try {
        const result = await indexMaterial(material);
        return res.status(201).json({
          message: 'Material publicado e indexado para o assistente.',
          id: material.id,
          ragStatus: material.rag_status,
          indexedChunks: result.indexedChunks,
        });
      } catch (error) {
        console.error('Material publicado, mas falhou sua indexação RAG:', error);
        return res.status(201).json({
          message: 'Material publicado, mas ainda não está disponível para o assistente.',
          warning: material.rag_error,
          id: material.id,
          ragStatus: material.rag_status,
        });
      }
    } catch (error) {
      discard(file);
      console.error('Erro ao publicar material:', error);
      return res.status(500).json({ error: 'Não foi possível publicar o material.' });
    }
  }

  async reindex(req, res) {
    try {
      if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Material não encontrado.' });
      const material = await Material.findByPk(req.params.id);
      if (!material) return res.status(404).json({ error: 'Material não encontrado.' });
      const filePath = path.resolve(uploadDir, path.basename(material.file_url));
      if (!filePath.startsWith(`${uploadDir}${path.sep}`) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo do material não encontrado no servidor.' });
      }
      const result = await indexMaterial(material);
      return res.status(200).json({
        message: 'Material indexado para o assistente.',
        id: material.id,
        ragStatus: material.rag_status,
        indexedChunks: result.indexedChunks,
      });
    } catch (error) {
      console.error('Erro ao reindexar material:', error);
      return res.status(500).json({
        error: error.message || 'Não foi possível indexar o material.',
      });
    }
  }
}

export default new MaterialController();
