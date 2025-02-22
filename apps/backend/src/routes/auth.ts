import { Router } from 'express';
import { signUp, signIn, signOut, deleteUser, getMe, refreshToken } from '../controllers/auth';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Authentication routes
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/signout', authenticateUser, signOut);
router.delete('/user', authenticateUser, deleteUser);
router.get('/me', authenticateUser, getMe);
router.post('/refresh', refreshToken);

export default router;
