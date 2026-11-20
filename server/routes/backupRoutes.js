import express from 'express';
import {
  createBackup,
  getBackups,
  downloadBackup,
  restoreBackup,
  deleteBackup,
} from '../controllers/backupController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin'));

router.get('/', getBackups);
router.post('/', createBackup);
router.get('/download/:id', downloadBackup);
router.post('/restore/:id', restoreBackup);
router.delete('/:id', deleteBackup);

export default router;