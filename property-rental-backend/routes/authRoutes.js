import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register); // no auth middleware here
router.post('/login', login);

export default router;
