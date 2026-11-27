import express from 'express';
import {
  createStaff,
  deleteManagedUser,
  listStaff,
  listUsers,
  resetManagedUserPassword,
  updateManagedUser,
  updateManagedUserPhoto,
} from '../controllers/adminUserController.js';
import { requireRole } from '../middlewares/authentication.js';
import { handleUpload, uploadSingleUserPhoto } from '../middlewares/upload.js';

const router = express.Router();

router.use(requireRole('admin'));
router.get('/staff', listStaff);
router.get('/users', listUsers);
router.post('/staff', handleUpload(uploadSingleUserPhoto), createStaff);
router.patch('/users/:userId', updateManagedUser);
router.patch('/users/:userId/photo', handleUpload(uploadSingleUserPhoto), updateManagedUserPhoto);
router.post('/users/:userId/reset-password', resetManagedUserPassword);
router.delete('/users/:userId', deleteManagedUser);

export default router;
