// routes/documentRoutes.js
import express from 'express';
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByMember,
  verifyDocument,
} from '../controllers/documentController.js';
import { validate, documentValidation } from '../middlewares/validation.js';
import { uploadSingleDocument, handleUpload } from '../middlewares/upload.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import { requireRole, authorizedFamilyIds } from '../middlewares/authentication.js';
import Member from '../models/Member.js';

const router = express.Router();

// Apply rate limiting
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
router.use(requireRole('admin', 'user'));

const scopeDocumentsForUser = async (req, res, next) => {
  if (req.user.role === 'admin') {
    req.documentQuery = {};
    return next();
  }

  try {
    const memberIds = [];
    if (req.user.linkedMember) memberIds.push(String(req.user.linkedMember));

    const familyIds = await authorizedFamilyIds(req.user);
    if (familyIds?.length) {
      const members = await Member.find({ family: { $in: familyIds } }).select('_id').lean();
      memberIds.push(...members.map((member) => String(member._id)));
    }

    if (!memberIds.length) {
      return res.status(403).json({ message: 'You do not have access to documents.' });
    }

    req.documentQuery = { member: { $in: [...new Set(memberIds)] } };
    next();
  } catch (error) {
    next(error);
  }
};

router.use(scopeDocumentsForUser);

// GET routes
router.get('/', getDocuments);
router.get('/member/:memberId', getDocumentsByMember);
router.get('/:id', getDocumentById);

// POST routes with file upload
router.post(
  '/',
  requireRole('admin'),
  handleUpload(uploadSingleDocument),
  validate(documentValidation),
  uploadDocument
);

// PUT routes with file upload
router.put(
  '/:id',
  requireRole('admin'),
  handleUpload(uploadSingleDocument),
  updateDocument
);

// DELETE routes
router.delete('/:id', requireRole('admin'), deleteDocument);

// Verification route
router.patch('/:id/verify', requireRole('admin'), verifyDocument);

export default router;