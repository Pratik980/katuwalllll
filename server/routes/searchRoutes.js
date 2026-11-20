import express from 'express';
import { requireFamilyAccess } from '../middlewares/authentication.js';
import {
  globalSearch,
  searchMembers,
  searchFamilies,
} from '../controllers/searchController.js';

const router = express.Router();

router.get('/', requireFamilyAccess, globalSearch);
router.get('/members', requireFamilyAccess, searchMembers);
router.get('/families', requireFamilyAccess, searchFamilies);

export default router;
