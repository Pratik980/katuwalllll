import express from 'express';
import {
  getSettings,
  updateSettings,
  updateSettingsSection,
} from '../controllers/settingsController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

for (const section of ['general', 'notifications', 'documents', 'reports', 'appearance', 'system', 'security', 'backup']) {
  router.put(`/${section}`, updateSettingsSection(section));
}

export default router;
