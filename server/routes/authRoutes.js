import express from 'express';
import {
  changePassword,
  forgotPassword,
  getCsrfToken,
  getCurrentUser,
  login,
  logout,
  resendOtp,
  resetPassword,
  signUp,
  updateCurrentUser,
  updateCurrentUserPhoto,
  verifyOtp,
} from '../controllers/authController.js';
import { authenticate, requireCsrf } from '../middlewares/authentication.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import { handleUpload, uploadSingleUserPhoto } from '../middlewares/upload.js';

const router = express.Router();
const sensitiveLimit = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  skipInDevelopment: false,
  keyGenerator: (req) => `${req.ip || req.connection.remoteAddress}:${String(req.body.email || req.user?._id || '').trim().toLowerCase()}`,
  message: 'Too many authentication attempts. Please try again later.',
});

router.get('/csrf', getCsrfToken);
router.post('/signup', sensitiveLimit(5), signUp);
router.post('/resend-otp', sensitiveLimit(5), resendOtp);
router.post('/verify-otp', sensitiveLimit(10), verifyOtp);
router.post('/login', sensitiveLimit(10), login);
router.post('/forgot-password', sensitiveLimit(5), forgotPassword);
router.post('/reset-password', sensitiveLimit(5), resetPassword);
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, requireCsrf, updateCurrentUser);
router.put('/me/photo', authenticate, requireCsrf, handleUpload(uploadSingleUserPhoto), updateCurrentUserPhoto);
router.post('/change-password', authenticate, requireCsrf, sensitiveLimit(5), changePassword);
router.post('/logout', authenticate, requireCsrf, logout);

export default router;
