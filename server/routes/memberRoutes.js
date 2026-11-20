// routes/memberRoutes.js
import express from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  getMembersByFamily,
  getMemberStats,
  getMemberOptions,
  updateVerification,
} from '../controllers/memberController.js';
import { validate, memberValidation, validateObjectId } from '../middlewares/validation.js';
import { uploadSinglePhoto, handleUpload } from '../middlewares/upload.js';
import {
  authenticate,
  requireCsrf,
  requireRole,
  requireFamilyAccess,
  requireMemberFamilyAccess,
} from '../middlewares/authentication.js';

const router = express.Router();

// GET routes
router.get('/', getMembers);
router.get('/stats', getMemberStats);
router.get('/search', searchMembers);
router.get('/options', getMemberOptions);
router.get(
  '/family/:familyId',
  validateObjectId('familyId', 'Family'),
  requireFamilyAccess,
  getMembersByFamily
);
router.get(
  '/:id',
  validateObjectId('id', 'Member'),
  requireMemberFamilyAccess,
  getMemberById
);

// POST routes with file upload
router.post(
  '/',
  authenticate,
  requireCsrf,
  requireRole('admin', 'staff'),
  handleUpload(uploadSinglePhoto),
  requireFamilyAccess,
  validate(memberValidation),
  createMember
);

// PUT routes with file upload
router.put(
  '/:id',
  authenticate,
  requireCsrf,
  requireRole('admin', 'staff'),
  validateObjectId('id', 'Member'),
  handleUpload(uploadSinglePhoto),
  requireFamilyAccess,
  requireMemberFamilyAccess,
  validate(memberValidation),
  updateMember
);

// Verification is its own small request, separate from the member form
router.put(
  '/:id/verification',
  authenticate,
  requireCsrf,
  requireRole('admin', 'staff'),
  validateObjectId('id', 'Member'),
  requireMemberFamilyAccess,
  updateVerification
);

// DELETE routes
router.delete(
  '/:id',
  authenticate,
  requireCsrf,
  requireRole('admin'),
  validateObjectId('id', 'Member'),
  requireMemberFamilyAccess,
  deleteMember
);

export default router;
