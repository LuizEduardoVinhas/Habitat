import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/uploads/materials');
fs.mkdirSync(dir, { recursive: true });
const submissionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/uploads/submissions');
fs.mkdirSync(submissionDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`), // nome aleatório: não depende do nome enviado
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(ok ? null : new Error('Envie apenas arquivos PDF.'), ok);
  },
});

// Responde em JSON quando o upload falha (tamanho, tipo etc.)
export const uploadPdf = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'O PDF deve ter no máximo 25 MB.' : err.message || 'Falha no envio do arquivo.';
    return res.status(400).json({ error: msg });
  });

const submissionTypes = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const submissionUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, submissionDir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${submissionTypes[file.mimetype] || ''}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = submissionTypes[file.mimetype]
      && (file.mimetype !== 'image/jpeg' || ['.jpg', '.jpeg'].includes(extension))
      && (file.mimetype !== 'image/png' || extension === '.png')
      && (file.mimetype !== 'application/pdf' || extension === '.pdf');
    cb(allowed ? null : new Error('Envie um PDF, uma imagem JPG ou uma imagem PNG.'), allowed);
  },
});

export const uploadSubmissionFile = (req, res, next) =>
  submissionUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'O arquivo deve ter no máximo 25 MB.' : err.message || 'Falha no envio do arquivo.';
    return res.status(400).json({ error: msg });
  });
