// // // routes/reportRoutes.js
// // import express from 'express';
// // import {
// //   generateGenealogyReport,
// //   generateFamilyReport,
// //   generateAllFamiliesReport,
// //   generateMemberReport,
// //   generateGenerationReport,
// //   generateDonationReport,
// //   generateDemographicReport,
// //   generateQRReport,
// // } from '../controllers/reportController.js';

// // const router = express.Router();

// // // All report routes
// // router.get('/genealogy', generateGenealogyReport);
// // router.get('/family', generateFamilyReport);
// // router.get('/all-families', generateAllFamiliesReport);
// // router.get('/members', generateMemberReport);
// // router.get('/generation', generateGenerationReport);
// // router.get('/donation', generateDonationReport);
// // router.get('/demographic', generateDemographicReport);
// // router.get('/qr', generateQRReport);

// // export default router;

// // routes/reportRoutes.js - UPDATED
// import express from 'express';
// import {
//   generateGenealogyReport,
//   generateFamilyReport,
//   generateAllFamiliesReport,
//   generateMemberReport,
//   generateGenerationReport,
//   generateDonationReport,
//   generateDemographicReport,
//   generateQRReport,
//   exportAllMembers,
//   exportFamilyTree,
// } from '../controllers/reportController.js';

// const router = express.Router();

// // All report routes
// router.get('/genealogy', generateGenealogyReport);
// router.get('/family', generateFamilyReport);
// router.get('/all-families', generateAllFamiliesReport);
// router.get('/members', generateMemberReport);
// router.get('/generation', generateGenerationReport);
// router.get('/donation', generateDonationReport);
// router.get('/demographic', generateDemographicReport);
// router.get('/qr', generateQRReport);

// // NEW: Export routes
// router.get('/export/members', exportAllMembers);
// router.get('/export/family-tree', exportFamilyTree);

// export default router;


// backend/src/routes/reportRoutes.js - UPDATED
import express from 'express';
import { authorizedFamilyIds, requireRole } from '../middlewares/authentication.js';
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

export const requireReportFamilyAccess = (queryField) => async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();
    if (!['staff', 'user'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access reports.' });
    }

    const familyId = req.query[queryField];
    if (typeof familyId !== 'string' || !familyId) {
      return res.status(400).json({ message: 'Select an authorized family for this report.' });
    }

    const familyIds = await authorizedFamilyIds(req.user);
    if (!familyIds.includes(familyId)) {
      return res.status(403).json({ message: 'You do not have access to this family report.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/genealogy', requireReportFamilyAccess('familyId'), generateGenealogyReport);
router.get('/family', requireReportFamilyAccess('familyId'), generateFamilyReport);
router.get('/all-families', requireRole('admin'), generateAllFamiliesReport);
router.get('/members', requireReportFamilyAccess('family'), generateMemberReport);
router.get('/generation', requireReportFamilyAccess('familyId'), generateGenerationReport);
router.get('/donation', requireRole('admin'), generateDonationReport);
router.get('/demographic', requireReportFamilyAccess('familyId'), generateDemographicReport);
router.get('/qr', requireRole('admin'), generateQRReport);

router.get('/export/members', requireRole('admin'), exportAllMembers);
router.get('/export/family-tree', requireReportFamilyAccess('familyId'), exportFamilyTree);

export default router;