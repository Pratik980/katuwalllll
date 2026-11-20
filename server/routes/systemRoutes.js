import express from 'express';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const router = express.Router();

router.get('/version', (req, res) => {
  res.json({ version });
});

export default router;
