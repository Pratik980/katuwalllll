import express from 'express';
import { createStaff, listUsers, updateManagedUser } from '../controllers/adminUserController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin'));
router.get('/users', listUsers);
router.post('/staff', createStaff);
router.patch('/users/:userId', updateManagedUser);

export default router;
