const path = require('path');
const express = require('express');

// cors: Cho phép frontend (khác domain/port) gọi API backend
const cors = require('cors');

// helmet: Tự động thêm các HTTP security headers để bảo vệ app khỏi các cuộc tấn công phổ biến
const helmet = require('helmet');

// morgan: Ghi log mỗi HTTP request để dễ debug (dev mode: màu sắc đẹp, production: format chuẩn Apache combined)
const morgan = require('morgan');

const env = require('./config/environment');

// uploadDir: Thư mục lưu ảnh bìa cục bộ (dùng để serve static file)
const { uploadDir } = require('./middleware/upload');

// Import tất cả các router theo từng domain chức năng
const authRoutes = require('./routes/authRoutes');
const storyRoutes = require('./routes/storyRoutes');
const readingHistoryRoutes = require('./routes/readingHistoryRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const aiRoutes = require('./routes/aiRoutes');
const commentRoutes = require('./routes/commentRoutes');
const followRoutes = require('./routes/followRoutes');
const preferencesRoutes = require('./routes/preferencesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tagRoutes = require('./routes/tagRoutes');
const apiRoutes = require('./routes');

// notFoundHandler: Trả về 404 khi route không tồn tại
// errorHandler: Xử lý tập trung tất cả lỗi được throw từ các controller
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Cấu hình helmet với crossOriginResourcePolicy: 'cross-origin' để cho phép
// ảnh từ Supabase Storage (khác domain) được load thành công trên frontend
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Cấu hình CORS với whitelist linh hoạt:
// - Cho phép tất cả requests không có origin (mobile app, Postman, curl)
// - Cho phép tất cả cổng localhost trong môi trường development
// - Chỉ cho phép domain frontend chính thức trong production
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow all localhost ports during development
      const localhostPattern = /^http:\/\/localhost(:\d+)?$/;
      if (localhostPattern.test(origin)) return callback(null, true);
      // Allow the configured frontend URL in production

      if (origin === env.FRONTEND_URL) return callback(null, true);
    
      // 3. Cho phép tất cả các nhánh preview/developer của cmc-truyen trên Vercel
      const vercelPreviewPattern = /^https:\/\/cmc-truyen.*\.vercel\.app$/;
      if (vercelPreviewPattern.test(origin)) return callback(null, true);
      
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Log HTTP request: 'dev' cho môi trường phát triển (output màu, ngắn gọn),
// 'combined' cho production (format Apache standard, phù hợp với log aggregator)
app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));

// Cho phép parse JSON body từ request với kích thước tối đa 10MB
// (cần thiết vì nội dung chương truyện có thể rất dài)
app.use(express.json({ limit: '10mb' }));

// Cho phép parse dữ liệu form URL-encoded (dùng cho form HTML truyền thống)
app.use(express.urlencoded({ extended: true }));

// Serve ảnh bìa từ thư mục uploads/covers dưới đường dẫn /uploads/covers
// Đây là fallback khi Supabase chưa được cấu hình (môi trường development)
app.use('/uploads/covers', express.static(uploadDir));

// Endpoint kiểm tra sức khỏe của server (health check)
// Dùng cho các service monitor (UptimeRobot, Render auto-ping, ...) để xác nhận backend đang chạy
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CMC Truyen backend is running',
    environment: env.NODE_ENV,
  });
});

// Đăng ký các route theo từng module chức năng
// Tất cả route đều có tiền tố /api/... để phân biệt với static assets
app.use('/api/auth', authRoutes);             // Đăng ký, đăng nhập, profile
app.use('/api/stories', storyRoutes);         // CRUD truyện
app.use('/api/reading-history', readingHistoryRoutes); // Lịch sử đọc, tiến độ
app.use('/api/chapters', chapterRoutes);      // CRUD chương (dùng cho summary AI)
app.use('/api/ai', aiRoutes);                 // AI recommendations
app.use('/api/comments', commentRoutes);      // Bình luận
app.use('/api/follows', followRoutes);        // Theo dõi truyện
app.use('/api/preferences', preferencesRoutes); // Cài đặt đọc truyện của user
app.use('/api/upload', uploadRoutes);         // Upload ảnh bìa lên Supabase
app.use('/api/admin', adminRoutes);           // Quản trị: user, thống kê
app.use('/api/tags', tagRoutes);              // Tags/thể loại truyện
app.use('/api', apiRoutes);                   // Route tổng hợp (index router)

// Middleware xử lý 404 khi không có route nào khớp với request
app.use(notFoundHandler);

// Middleware xử lý lỗi tập trung - phải đặt CUỐI CÙNG và có 4 tham số (err, req, res, next)
app.use(errorHandler);

module.exports = app;
module.exports.default = app;