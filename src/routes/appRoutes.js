import { Router } from 'express';
import { ensureAuthenticated, ensureRole } from '../middlewares/authMiddleware.js';
import { uploadPdf, uploadSubmissionFile } from '../middlewares/upload.js';
import AppointmentController from '../controllers/AppointmentController.js';
import ResearchBlockController from '../controllers/ResearchBlockController.js';
import MaterialController from '../controllers/MaterialController.js';
import SubmissionController from '../controllers/SubmissionController.js';
import ChatController from '../controllers/ChatController.js';

const router = Router();
const teacher = [ensureAuthenticated, ensureRole(['TEACHER'])];
const student = [ensureAuthenticated, ensureRole(['STUDENT'])];
const signedIn = [ensureAuthenticated, ensureRole(['STUDENT', 'TEACHER'])];

// Pública: família/aluno solicita a aula avaliativa
router.post('/appointments', AppointmentController.store);

// Painel da professora
router.post('/admin/research-blocks', ...teacher, ResearchBlockController.store);
router.post('/admin/materials', ...teacher, uploadPdf, MaterialController.store);
router.post('/admin/materials/:id/index', ...teacher, MaterialController.reindex);

// Acrescentadas por exigência das telas (aprovar/cancelar aula e excluir bloqueio)
router.patch('/admin/appointments/:id/status', ...teacher, AppointmentController.updateStatus);
router.delete('/admin/research-blocks/:id', ...teacher, ResearchBlockController.destroy);
router.post('/student/submissions', ...student, uploadSubmissionFile, SubmissionController.store);
router.patch('/admin/submissions/:id/review', ...teacher, SubmissionController.review);
router.get('/submissions/:id/file', ...signedIn, SubmissionController.download);
router.post('/api/student/chat', ...student, ChatController.ask);

export default router;
