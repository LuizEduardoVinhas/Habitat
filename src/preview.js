import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { helpers } from './utils/view-helpers.js';
import site from './config/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const subjectAreas = [
  { id: 'demo-natural-sciences', code: 'NATURAL_SCIENCES', name: 'Ciências da Natureza' },
  { id: 'demo-languages', code: 'LANGUAGES', name: 'Linguagens' },
  { id: 'demo-human-sciences', code: 'HUMAN_SCIENCES', name: 'Ciências Humanas' },
];
const student = { id: 'demo-student', full_name: 'Luiz Silva', email: 'aluno@example.com', role: 'STUDENT' };
const material = {
  id: 'demo-material',
  title: 'Ecossistemas marinhos e bioacumulação',
  description: 'A bioacumulação acontece quando uma substância se concentra em um organismo ao longo do tempo.\n\nA biomagnificação descreve o aumento dessa concentração nos níveis mais altos da cadeia alimentar. Por isso, predadores de topo podem ajudar pesquisadores a observar mudanças nos ecossistemas.',
  file_url: '/preview-material.pdf',
  createdAt: new Date(),
  area: { code: 'NATURAL_SCIENCES', name: 'Ciências da Natureza' },
};
const previewPdfStream = 'BT /F1 18 Tf 72 720 Td (Material de demonstracao - SaaS Teacher) Tj ET';
const pdfObjects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(previewPdfStream, 'ascii')} >>\nstream\n${previewPdfStream}\nendstream`,
];
let previewPdfText = '%PDF-1.4\n';
const pdfOffsets = [0];
pdfObjects.forEach((object, index) => {
  pdfOffsets.push(Buffer.byteLength(previewPdfText, 'ascii'));
  previewPdfText += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xrefOffset = Buffer.byteLength(previewPdfText, 'ascii');
previewPdfText += `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
pdfOffsets.slice(1).forEach((offset) => {
  previewPdfText += `${String(offset).padStart(10, '0')} 00000 n \n`;
});
previewPdfText += `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
const previewPdf = Buffer.from(previewPdfText, 'ascii');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
Object.assign(app.locals, helpers, { site, user: null });
app.use(express.static(path.join(__dirname, '../public')));
app.get('/preview-material.pdf', (req, res) => res.type('application/pdf').send(previewPdf));

app.get('/', (req, res) => res.render('public/index', { subjectAreas }));
app.get('/public', (req, res) => res.redirect('/'));
app.get('/login', (req, res) => res.render('auth/login'));
app.get('/agendar', (req, res) => {
  const selectedArea = subjectAreas.find((area) => area.code === req.query.area || area.id === req.query.area);
  res.render('public/schedule', {
    subjectAreas,
    boot: {
      areas: subjectAreas.map(({ id, code, name }) => ({ id, code, name })),
      busy: [],
      slots: ['09:00', '10:30', '14:00', '15:30', '17:00'],
      prefill: {
        areaId: selectedArea?.id || null,
        studentName: String(req.query.name || '').slice(0, 120),
        contact: [req.query.phone, req.query.email].filter(Boolean).join(' • ').slice(0, 160),
        observations: String(req.query.notes || '').slice(0, 1500),
      },
    },
  });
});
app.get('/student', (req, res) => res.redirect('/student/dashboard'));
app.get('/student/dashboard', (req, res) => {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(14, 0, 0, 0);
  const end = new Date(start.getTime() + 50 * 60 * 1000);
  res.render('student/dashboard', {
    user: student,
    appointments: [{ status: 'CONFIRMED', start, end, areaName: 'Ciências da Natureza' }],
    materials: [{ ...material, target_student_id: student.id }],
    stats: { totalMaterials: 1, confirmedCount: 1 },
  });
});
app.get('/student/materials/demo-material', (req, res) => res.render('student/material', { user: student, material }));

const port = Number(process.env.PREVIEW_PORT || 4173);
app.listen(port, () => {
  console.log(`Prévia disponível em http://localhost:${port}`);
});