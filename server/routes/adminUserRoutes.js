import express from 'express';
import {
  createStaff,
  deleteManagedUser,
  listUsers,
  resetManagedUserPassword,
  updateManagedUser,
} from '../controllers/adminUserController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin'));
router.get('/users', listUsers);
router.post('/staff', createStaff);
router.patch('/users/:userId', updateManagedUser);
router.post('/users/:userId/reset-password', resetManagedUserPassword);
router.delete('/users/:userId', deleteManagedUser);

export default router;
