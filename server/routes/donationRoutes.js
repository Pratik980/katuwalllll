// backend/src/routes/donationRoutes.js - UPDATED
import express from 'express';
import {
  getDonations,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
  getDonationStats,
  exportAllDonationsToExcel,
  exportDonationToExcel,
} from '../controllers/donationController.js';
import { validate, donationValidation } from '../middlewares/validation.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin', 'staff'));

// Admin-only financial/management routes (must be before /:id)
router.get('/stats', requireRole('admin'), getDonationStats);
router.get('/export/all', requireRole('admin'), exportAllDonationsToExcel);
router.get('/export/:id', requireRole('admin'), exportDonationToExcel);

// Read routes (staff sees non-financial fields only; enforced in controller)
router.get('/', getDonations);
router.get('/:id', getDonationById);

router.post('/', requireRole('admin'), validate(donationValidation), createDonation);
router.put('/:id', requireRole('admin'), validate(donationValidation), updateDonation);
router.delete('/:id', requireRole('admin'), deleteDonation);

export default router;