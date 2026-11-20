
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimit } from './middlewares/rateLimit.js';
import { authenticate, requireCsrf, getJwtSecret, getOtpSecret, parseCookies } from './middlewares/authentication.js';
import User from './models/User.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import familyRoutes from './routes/familyRoutes.js';

import notificationRoutes from './routes/notificationRoutes.js';

import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import houseRoutes from './routes/houseRoutes.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && process.env.SKIP_AUTH === '1') {
  throw new Error('SKIP_AUTH must never be enabled in production.');
}
if (Object.prototype.hasOwnProperty.call(process.env, 'AUTH_OTP_SECRET')) getOtpSecret();

// Try to import logger, fallback to console if not available
let logger;
try {
  logger = (await import('./middlewares/logger.js')).logger;
} catch (error) {
  console.warn('Logger middleware not found, using default console logger');
  logger = {
    dev: (req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    },
    combined: (req, res, next) => {
      console.log(`${req.method} ${req.url} - ${res.statusCode}`);
      next();
    }
  };
}

const app = express();
const httpServer = createServer(app);
const normalizeOrigin = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  try {
    const origin = new URL(trimmed).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

const allowedOrigins = new Set(
  [
    ...(process.env.FRONTEND_URL || '').split(','),
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ].map(normalizeOrigin).filter(Boolean)
);

const isLoopbackOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (allowedOrigins.has(normalized)) return true;
  try {
    const url = new URL(normalized);
    if (url.hostname.endsWith('.vercel.app')) return true;
  } catch {}
  return process.env.NODE_ENV !== 'production' && isLoopbackOrigin(normalized);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
    },
  },
}));

app.use(compression());
app.use(cors(corsOptions));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(logger.combined);
} else {
  app.use(logger.dev);
}

// Behind a hosting proxy every visitor would otherwise look like one address.
// Set TRUST_PROXY=1 on such a host so each visitor is counted separately.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Rate limiting: one page of this app makes several requests, and a day of data
// entry makes thousands, so the limit only has to stop runaway loops and abuse.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 3000,
}));

const expensiveRateLimit = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  skipInDevelopment: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(async (req, res, next) => {
  if (req.path === '/health' || process.env.NODE_ENV === 'test') return next();
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Routes
app.use('/api/auth', authRoutes);

// Every other API endpoint requires a valid session and CSRF token.
app.use('/api', authenticate);
app.use('/api', requireCsrf);

app.use('/api/reports', expensiveRateLimit(200));
app.use('/api/search', expensiveRateLimit(300));
app.use('/api/drafts', expensiveRateLimit(300));
app.use('/api/backup', expensiveRateLimit(50));

app.use('/api/admin', adminUserRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api/members', memberRoutes);
app.use('/api/families', familyRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/system', systemRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use(errorHandler);

// Socket.IO events
const chatRooms = new Set([
  'general',
  'announcements',
  'family_discussion',
  'events',
  'genealogy_help',
]);

const resolveChatRoom = (payload) => {
  const room = typeof payload === 'string' ? payload : payload?.room;
  return typeof room === 'string' && chatRooms.has(room) ? room : null;
};

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = parseCookies(Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader);
    const token = cookies.access_token;
    if (!token) return next(new Error('Authentication required.'));

    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('+tokenVersion role isActive emailVerified').lean();
    if (!user || !user.isActive || !user.emailVerified || user.tokenVersion !== payload.ver) {
      return next(new Error('Authentication required.'));
    }

    socket.data.user = {
      id: String(user._id),
      _id: String(user._id),
      role: user.role,
      email: user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);
  console.log('Client connected:', socket.id, user.id);

  const joinChatRoom = (payload) => {
    const room = resolveChatRoom(payload);
    if (!room) return;
    socket.join(room);
    console.log(`Socket ${socket.id} joined chat room: ${room}`);
  };

  const leaveChatRoom = (payload) => {
    const room = resolveChatRoom(payload);
    if (!room) return;
    socket.leave(room);
    console.log(`Socket ${socket.id} left chat room: ${room}`);
  };

  socket.on('joinChatRoom', joinChatRoom);
  socket.on('leaveChatRoom', leaveChatRoom);
  socket.on('join', joinChatRoom);
  socket.on('leave', leaveChatRoom);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Export io and app
export { io, app };
export default app;

// Start server
const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📡 API URL: http://localhost:${PORT}/api`);
        console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'https://katuwalbanshabatika.netlify.app'}`);
        console.log(`📁 JSON body limit: 10MB`);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});