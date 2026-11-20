import express from 'express';
import {
  getLoginHistory,
  getActiveDevices,
  forceLogoutAll,
  updateSecuritySettings,
} from '../controllers/securityController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin'));

router.get('/login-history', getLoginHistory);
router.get('/active-devices', getActiveDevices);
router.post('/force-logout', forceLogoutAll);
router.put('/settings', updateSecuritySettings);

export default router;
