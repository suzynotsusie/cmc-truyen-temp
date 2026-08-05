const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/environment');
const { uploadDir } = require('./middleware/upload');
const { localizeErrorResponse } = require('./middleware/localizeErrorResponse');
const { loadModerationData } = require('./services/moderationService');

// Import tất cả các router
const authRoutes = require('./routes/authRoutes');
const storyRoutes = require('./routes/storyRoutes');
const readingHistoryRoutes = require('./routes/readingHistoryRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const aiRoutes = require('./routes/aiRoutes');
const commentRoutes = require('./routes/commentRoutes');
const followRoutes = require('./routes/followRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const preferencesRoutes = require('./routes/preferencesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tagRoutes = require('./routes/tagRoutes');
const reportRoutes = require('./routes/reportRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const walletRoutes = require('./routes/walletRoutes');
const topupRoutes = require('./routes/topupRoutes');
const payoutRoutes = require('./routes/payoutRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security & Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const localhostPattern = /^http:\/\/localhost(:\d+)?$/;
      if (localhostPattern.test(origin)) return callback(null, true);

      if (env.FRONTEND_URL && origin === env.FRONTEND_URL) return callback(null, true);

      if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(localizeErrorResponse);

// Static files
app.use('/uploads/covers', express.static(uploadDir));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CMC Truyen backend is running',
    environment: env.NODE_ENV,
  });
});

// Route đăng ký
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/reading-history', readingHistoryRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/topup', topupRoutes);
app.use('/api/payouts', payoutRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
