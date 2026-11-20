import express from 'express';
import {
  getDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  deleteDraft,
  submitDraft,
} from '../controllers/draftController.js';
import { validate, draftValidation, validateObjectId } from '../middlewares/validation.js';
import { authenticate, requireCsrf } from '../middlewares/authentication.js';

const router = express.Router();

const writable = [authenticate, requireCsrf];

router.get('/', getDrafts);
router.get('/:id', validateObjectId('id', 'Draft'), getDraftById);
router.post('/', ...writable, validate(draftValidation), createDraft);
router.put('/:id', ...writable, validateObjectId('id', 'Draft'), updateDraft);
router.delete('/:id', ...writable, validateObjectId('id', 'Draft'), deleteDraft);
router.put('/:id/submit', ...writable, validateObjectId('id', 'Draft'), submitDraft);

export default router;
