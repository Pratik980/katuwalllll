import express from 'express';
import { requireFamilyAccess } from '../middlewares/authentication.js';
import {
  getDashboardStats,
  getQuickStats,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', requireFamilyAccess, getDashboardStats);
router.get('/quick-stats', requireFamilyAccess, getQuickStats);

export default router;
