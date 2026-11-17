// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimit } from './middlewares/rateLimit.js';

// Import routes
import memberRoutes from './routes/memberRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import houseRoutes from './routes/houseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import { authenticate, authorizedFamilyIds, getJwtSecret, requireCsrf, requireRole } from './middlewares/authentication.js';
import User from './models/User.js';

dotenv.config();

const isAllowedOrigin = (origin, callback) => {
  // const configuredOrigin = process.env.FRONTEND_URL || 'https://katuwalbanshabatika.netlify.app';
  const configuredOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const isLocalDevelopmentOrigin =
    process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');

  if (!origin || origin === configuredOrigin || isLocalDevelopmentOrigin) {
    return callback(null, true);
  }

  return callback(new Error('Origin is not allowed by CORS'));
};

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
const io = new Server(httpServer, {
  cors: {
    origin: isAllowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return ['', ''];
      return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
    }).filter(([name]) => name));
    const token = cookies.access_token;
    if (!token) return next(new Error('Authentication required.'));

    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || !user.isActive || !user.emailVerified || user.tokenVersion !== payload.ver) {
      return next(new Error('Session is no longer valid.'));
    }
    socket.data.user = user;
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: isAllowedOrigin,
  credentials: true,
}));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(logger.combined);
} else {
  app.use(logger.dev);
}

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authenticate);
app.use('/api', requireCsrf);
app.use('/api/admin', adminUserRoutes);
app.use('/api/donations', requireRole('admin'));
app.use('/api/backup', requireRole('admin'));
app.use('/api/organization', requireRole('admin'));
app.use('/api/notifications', requireRole('admin'));
app.use('/api/documents', requireRole('admin'));
app.use('/api/houses', requireRole('admin'));
app.use('/api/drafts', requireRole('admin'));
app.use('/api/members', memberRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/houses', houseRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Error handling
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  const allowedChatRooms = new Set([
    'general',
    'announcements',
    'family_discussion',
    'events',
    'genealogy_help',
  ]);
  socket.join(`role:${socket.data.user.role}`);
  socket.join(`user:${socket.data.user._id}`);

  socket.on('joinChatRoom', (room) => {
    if (typeof room === 'string' && allowedChatRooms.has(room)) socket.join(room);
  });
  
  socket.on('leaveChatRoom', (room) => {
    if (typeof room === 'string' && allowedChatRooms.has(room)) socket.leave(room);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Export io for use in controllers
export { io };

// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      // console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'https://katuwalbanshabatika.netlify.app'}`)
      
      console.log(`📁 Upload limit: 15MB`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

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