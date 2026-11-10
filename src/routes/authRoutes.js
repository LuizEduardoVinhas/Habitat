import { Router } from 'express';
import SessionController from '../controllers/SessionController.js';

const router = Router();

router.post('/auth/register', SessionController.register);
router.post('/auth/login', SessionController.login);
router.delete('/auth/logout', SessionController.logout);
router.get('/auth/me', SessionController.show);

export default router;
