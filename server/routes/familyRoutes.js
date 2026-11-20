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
import { validate, familyValidation, validateObjectId } from '../middlewares/validation.js';
import { uploadSingleFamilyPhoto, handleUpload } from '../middlewares/upload.js';
import {
  authenticate,
  requireCsrf,
  requireRole,
  requireFamilyAccess,
} from '../middlewares/authentication.js';

const router = express.Router();

const writable = [authenticate, requireCsrf, requireRole('admin', 'staff')];

// GET routes - ORDER MATTERS! Put specific routes before parameter routes
router.get('/', getFamilies);
router.get('/stats', getFamilyStats);
router.get('/next-number/:houseId', validateObjectId('houseId', 'House'), getNextFamilyNumber);
router.get(
  '/next-vansha/:familyId',
  validateObjectId('familyId', 'Family'),
  requireFamilyAccess,
  getNextVanshaNumber
);
// ⭐ NEW: Get Bansha numbers for a family
router.get(
  '/:familyId/bansha-numbers',
  validateObjectId('familyId', 'Family'),
  requireFamilyAccess,
  getFamilyBanshaNumbers
);
router.get(
  '/:familyId/tree',
  validateObjectId('familyId', 'Family'),
  requireFamilyAccess,
  getFamilyTreeByFamily
);
router.get('/:id', validateObjectId('id', 'Family'), requireFamilyAccess, getFamilyById);

// POST routes with file upload
router.post(
  '/',
  ...writable,
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  createFamily
);

// PUT routes with file upload
router.put(
  '/:id',
  ...writable,
  validateObjectId('id', 'Family'),
  requireFamilyAccess,
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  updateFamily
);

// DELETE routes
router.delete(
  '/:id',
  authenticate,
  requireCsrf,
  requireRole('admin'),
  validateObjectId('id', 'Family'),
  requireFamilyAccess,
  deleteFamily
);

// Close/Reopen routes
router.post(
  '/:id/close',
  ...writable,
  validateObjectId('id', 'Family'),
  requireFamilyAccess,
  closeFamily
);
router.post(
  '/:id/reopen',
  ...writable,
  validateObjectId('id', 'Family'),
  requireFamilyAccess,
  reopenFamily
);

export default router;
