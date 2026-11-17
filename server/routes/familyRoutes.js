// routes/familyRoutes.js - UPDATED

import express from 'express';
import {
  getFamilies,
  getFamilyTreeByFamily,
  getFamilyById,
  createFamily,
  updateFamily,
  deleteFamily,
  getFamilyStats,
  closeFamily,
  reopenFamily,
  getNextFamilyNumber,
  getNextVanshaNumber,
  getFamilyBanshaNumbers, // ⭐ NEW
} from '../controllers/familyController.js';
import { validate, familyValidation } from '../middlewares/validation.js';
import { uploadSingleFamilyPhoto, handleUpload } from '../middlewares/upload.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import { requireFamilyAccess, requireRole } from '../middlewares/authentication.js';

const router = express.Router();

// Apply rate limiting
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// GET routes - ORDER MATTERS! Put specific routes before parameter routes
router.get('/', getFamilies);
router.get('/stats', getFamilyStats);
router.get('/next-number/:houseId', requireRole('admin'), getNextFamilyNumber);
router.get('/next-vansha/:familyId', requireFamilyAccess, getNextVanshaNumber);
// ⭐ NEW: Get Bansha numbers for a family
router.get('/:familyId/bansha-numbers', requireFamilyAccess, getFamilyBanshaNumbers);
router.get('/:familyId/tree', requireFamilyAccess, getFamilyTreeByFamily);
router.get('/:id', requireFamilyAccess, getFamilyById);

// POST routes with file upload
router.post(
  '/',
  requireRole('admin'),
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  createFamily
);

// PUT routes with file upload
router.put(
  '/:id',
  requireRole('admin'),
  requireFamilyAccess,
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  updateFamily
);

// DELETE routes
router.delete('/:id', requireRole('admin'), deleteFamily);

// Close/Reopen routes
router.post('/:id/close', requireRole('admin'), closeFamily);
router.post('/:id/reopen', requireRole('admin'), reopenFamily);

export default router;