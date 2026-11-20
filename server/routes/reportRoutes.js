import express from 'express';
import { requireRole, requireFamilyAccess, authorizedFamilyIds } from '../middlewares/authentication.js';
import {
  generateGenealogyReport,
  generateFamilyReport,
  generateAllFamiliesReport,
  generateMemberReport,
  generateGenerationReport,
  generateDonationReport,
  generateDemographicReport,
  generateQRReport,
  exportAllMembers,
  exportFamilyTree,
} from '../controllers/reportController.js';

const router = express.Router();

const readReports = requireRole('admin', 'staff', 'user');
const exportReports = requireRole('admin', 'staff');

export const requireReportFamilyAccess = (param = 'familyId') => async (req, res, next) => {
  try {
    const familyIds = await authorizedFamilyIds(req.user);
    if (familyIds === null) {
      req.authorizedFamilyIds = null;
      return next();
    }

    const requested = String(req.query?.[param] ?? req.params?.[param] ?? '');
    if (!requested) {
      return res.status(400).json({ message: 'Family ID is required' });
    }
    if (!familyIds.map(String).includes(requested)) {
      return res.status(403).json({ message: 'You do not have access to this family.' });
    }

    req.authorizedFamilyIds = familyIds;
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/genealogy', readReports, requireFamilyAccess, generateGenealogyReport);
router.get('/family', readReports, requireReportFamilyAccess('familyId'), generateFamilyReport);
router.get('/all-families', readReports, requireFamilyAccess, generateAllFamiliesReport);
router.get('/members', readReports, requireFamilyAccess, generateMemberReport);
router.get('/generation', readReports, requireFamilyAccess, generateGenerationReport);
router.get('/donation', requireRole('admin', 'staff'), generateDonationReport);
router.get('/demographic', readReports, requireFamilyAccess, generateDemographicReport);
router.get('/qr', readReports, requireFamilyAccess, generateQRReport);

router.get('/export/members', exportReports, requireFamilyAccess, exportAllMembers);
router.get('/export/family-tree', exportReports, requireReportFamilyAccess('familyId'), exportFamilyTree);

export default router;
