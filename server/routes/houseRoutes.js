// routes/houseRoutes.js
import express from 'express';
import {
  getHouses,
  getHouseById,
  createHouse,
  updateHouse,
  deleteHouse,
  getNextHouseNumber,
  getHouseStats,
} from '../controllers/houseController.js';
import { validate, houseValidation, validateObjectId } from '../middlewares/validation.js';
import {
  authenticate,
  requireCsrf,
  requireRole,
} from '../middlewares/authentication.js';

const router = express.Router();

const writable = [authenticate, requireCsrf, requireRole('admin', 'staff')];

// GET routes
router.get('/', getHouses);
router.get('/stats', getHouseStats);
router.get('/next-number', getNextHouseNumber);
router.get('/:id', validateObjectId('id', 'House'), getHouseById);

// POST routes
router.post('/', ...writable, validate(houseValidation), createHouse);

// PUT routes
router.put('/:id', ...writable, validateObjectId('id', 'House'), validate(houseValidation), updateHouse);

// DELETE routes
router.delete(
  '/:id',
  authenticate,
  requireCsrf,
  requireRole('admin'),
  validateObjectId('id', 'House'),
  deleteHouse
);

export default router;
