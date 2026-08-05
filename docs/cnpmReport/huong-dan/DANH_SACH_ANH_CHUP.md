# HUỚNG DẪN VÀ DANH SÁCH ẢNH CHỤP MINH CHỨNG BÁO CÁO (TRÍCH XUẤT CHÍNH XÁC TỪ CODEBASE)

> **Thư mục lưu ảnh:** `C:\Users\ku060\Downloads\baocaoweb\images\screenshots\`  
> **Định dạng file:** Ảnh `.png`, đặt tên chính xác theo danh sách bên dưới.

---

## PHẦN I: ÁNH CHỤP MÃ NGUỒN VÀ CẤU TRÚC DỰ ÁN (8 ẢNH)

### 1. `fe-folder-tree.png` — Cây thư mục Frontend
* **Vị trí mở:** VS Code $\rightarrow$ Mở thư mục `frontend/src`
* **Nội dung chụp:** Cây thư mục phía client.
* **Cấu trúc thư mục chính từ dự án (`frontend/src`):**
  ```text
  frontend/src/
  ├── components/       # Component dùng chung (Navbar, Footer, CommentSection, StoryCard...)
  ├── contexts/         # React Contexts (AuthContext.jsx, ThemeContext.jsx)
  ├── data/             # Mock data & Constants
  ├── layouts/          # Layouts (AdminLayout.jsx, ModeratorLayout.jsx)
  ├── lib/              # Utility helpers
  ├── pages/            # Các trang giao diện (HomePage, StoryDetailPage, Reader...)
  ├── services/         # API Service Client (api.js)
  ├── styles/           # CSS & Theme styles (main.css, darkmode...)
  ├── App.jsx           # Khai báo Route & Provider chính
  └── main.jsx          # Entry point render React 18
  ```

---

### 2. `fe-app-routes-code.png` — Khai báo Route & Route Guard Frontend
* **Vị trí mở:** File [`frontend/src/App.jsx`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/frontend/src/App.jsx) (Mở từ dòng 119 đến dòng 165)
* **Code đầy đủ và chính xác 100% từ dự án:**
```jsx
              <Route
                path="/dashboard"
                element={
                  <RoleProtectedRoute allowedRoles={['Uploader', 'Admin']}>
                    <DashboardPage />
                  </RoleProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ADMIN LAYOUT RIÊNG */}
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['Admin']}>
                  <AdminLayout />
                </RoleProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/stories" element={<AdminStoriesPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/bad-words" element={<ManageBadWords />} />
              <Route path="/admin/comments" element={<ModeratorCommentsPage />} />
              <Route path="/admin/profiles" element={<ModeratorProfilesPage />} />
              <Route path="/admin/logs" element={<AuditLogsPage />} />
            </Route>

            {/* MODERATOR LAYOUT RIÊNG */}
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['Moderator', 'Admin']}>
                  <ModeratorLayout />
                </RoleProtectedRoute>
              }
            >
              <Route path="/moderator/dashboard" element={<ModeratorDashboardPage />} />
              <Route path="/moderator/pending-stories" element={<ModeratorPendingStoriesPage />} />
              <Route path="/moderator/reports" element={<AdminReportsPage />} />
              <Route path="/moderator/comments" element={<ModeratorCommentsPage />} />
              <Route path="/moderator/profiles" element={<ModeratorProfilesPage />} />
              <Route path="/moderator/logs" element={<AuditLogsPage />} />
            </Route>
```

---

### 3. `fe-api-interceptor-code.png` — Axios Client & Bearer Interceptor
* **Vị trí mở:** File [`frontend/src/services/api.js`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/frontend/src/services/api.js) (Mở từ dòng 35 đến dòng 90)
* **Code đầy đủ và chính xác 100% từ dự án:**
```javascript
// Tạo axios instance với cấu hình chung
// Mọi request qua apiClient đều tự động có baseURL và Content-Type đúng
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: Tự động thêm Authorization header vào mỗi request.
 * Chạy TRƯỚC KHI request được gửi đi.
 * Nếu có token trong localStorage, gắn vào header dạng "Bearer <token>".
 */
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('cmc_token');
    if (token && token !== 'null') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    // localStorage may be unavailable in some environments (private mode, strict policies).
    // Silently ignore so the app doesn't spam the console or throw runtime errors.
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Response Interceptor: Xử lý tự động khi server trả về lỗi 401 (Unauthorized).
 * Chạy SAU KHI nhận response lỗi từ server.
 */
apiClient.interceptors.response.use(
  (response) => response, // Nếu thành công, trả về nguyên response
  (error) => {
    if ((error?.response?.status === 401 || error?.response?.status === 403) && typeof window !== 'undefined') {
      const path = window.location.pathname;

      // Chỉ redirect nếu KHÔNG đang ở các trang public (login, register, home)
      if (!path.startsWith('/login') && !path.startsWith('/register') && path !== '/') {
        clearAuthStorage();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

### 4. `be-folder-tree.png` — Cây thư mục Backend
* **Vị trí mở:** VS Code $\rightarrow$ Mở thư mục `backend/src`
* **Nội dung chụp:** Cây thư mục phân lớp Backend Node.js/Express.
* **Cấu trúc thư mục chính từ dự án (`backend/src`):**
  ```text
  backend/src/
  ├── config/           # Environment, Database Postgres, Redis, Supabase
  ├── controllers/      # Controller điều phối (authController, storyController, adminController...)
  ├── middleware/       # JWT authMiddleware, roleMiddleware, auditMiddleware, rate limit
  ├── models/           # DDL và truy vấn SQL (User.js, Story.js, Chapter.js, BadWord.js...)
  ├── routes/           # REST API Routes (authRoutes, storyRoutes, adminRoutes, reportRoutes...)
  ├── scripts/          # Migration SQL scripts
  ├── services/         # Business services (AI, email, queue, moderationService...)
  ├── workers/          # Background worker tasks (BullMQ workers)
  ├── app.js            # Khởi tạo Express app & Middleware pipeline
  └── server.js         # Entry point khởi chạy HTTP Server (Port 5000)
  ```

---

### 5. `be-app-routes-code.png` — Security Middleware & API Route Mounting
* **Vị trí mở:** File [`backend/src/app.js`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/backend/src/app.js) (Mở từ dòng 33 đến dòng 84)
* **Code đầy đủ và chính xác 100% từ dự án:**
```javascript
// Security & Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const localhostPattern = /^http:\/\/localhost(:\d+)?$/;
      if (localhostPattern.test(origin)) return callback(null, true);
      if (origin === env.FRONTEND_URL) return callback(null, true);
      const vercelPreviewPattern = /^https:\/\/cmc-truyen.*\.vercel\.app$/;
      if (vercelPreviewPattern.test(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
```

---

### 6. `be-auth-rbac-code.png` — JWT Authenticate & RBAC Middleware
* **Vị trí mở:** File [`backend/src/middleware/authMiddleware.js`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/backend/src/middleware/authMiddleware.js) (từ dòng 16 đến 48) và [`roleMiddleware.js`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/backend/src/middleware/roleMiddleware.js) (từ dòng 5 đến 31)
* **Code đầy đủ và chính xác 100% từ dự án:**

**Đoạn 1: `authMiddleware.js` (Xác thực JWT Token):**
```javascript
function authenticateToken(req, res, next) {
  // Đọc giá trị header Authorization từ request
  const authHeader = req.headers.authorization;

  // Kiểm tra header phải tồn tại và có đúng định dạng "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  // Tách lấy phần token sau chữ "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    // Giải mã và xác thực JWT với secret key từ môi trường
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Gán payload đã giải mã (chứa id, username, email, role) vào req.user
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
```

**Đoạn 2: `roleMiddleware.js` (Phân quyền RBAC theo Role):**
```javascript
function authorizeRole(...roles) {
  return (req, res, next) => {
    // 1. Kiểm tra req.user đã tồn tại chưa
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No role information found',
      });
    }

    // 2. Chuyển đổi về chữ thường để so sánh
    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map(role => role.toLowerCase());

    // 3. Kiểm tra quyền
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
      });
    }

    // 4. Hợp lệ
    return next();
  };
}
```

---

### 7. `db-folder-schema.png` — Thư mục Database & Migrations
* **Vị trí mở:** VS Code $\rightarrow$ Mở thư mục `backend/scripts` và `backend/src/scripts/migrations`
* **Nội dung chụp:** Cây thư mục lưu trữ DDL SQL và script migration.
* **Cấu trúc thư mục từ dự án:**
  ```text
  backend/scripts/
  ├── add-tags.sql
  ├── create-notifications-tables.js
  ├── init-db.js
  ├── init_reports_table.sql
  ├── schema.sql              # Database PostgreSQL Schema chính
  ├── seed-data.js            # Seed dữ liệu mẫu
  ├── sync-story-tags.js
  └── update-covers.js

  backend/src/scripts/migrations/
  ├── 001_api_performance_indexes.sql
  └── 002_add_tag_moderation.sql
  ```

---

### 8. `db-main-sql-code.png` — PostgreSQL DDL Table Definitions
* **Vị trí mở:** File [`backend/scripts/schema.sql`](file:///c:/Users/ku060/Downloads/cmc-truyen-temp/backend/scripts/schema.sql) (Mở từ dòng 37 đến dòng 80)
* **Code đầy đủ và chính xác 100% từ dự án:**
```sql
-- -----------------------------------------------------------------------------
-- stories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    author_id INTEGER REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    category VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Ongoing'
        CHECK (status IN ('Ongoing', 'Completed', 'Hiatus')),
    total_chapters INTEGER NOT NULL DEFAULT 0,
    weekly_views INTEGER NOT NULL DEFAULT 0,
    monthly_views INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    average_rating NUMERIC(4,2) NOT NULL DEFAULT 0,
    total_rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN NOT NULL DEFAULT false,
    hidden_by_admin BOOLEAN NOT NULL DEFAULT false,
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'approved', 'changes_requested', 'rejected')),
    moderation_note TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- chapters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (story_id, chapter_number)
);
```

---

## PHẦN II: ÁNH CHỤP GIAO DIỆN WEB THỰC TẾ (10 ẢNH)

> ⚠️ **LƯU Ý KHI CHỤP GIAO DIỆN:**  
> - Chạy dự án: `npm run dev` tại frontend (`http://localhost:3000`) và `npm run dev` tại backend (`http://localhost:5000`).
> - Sau khi chụp xong, **chuyển ảnh sang hiệu ứng Trắng Đen (Grayscale)** trước khi lưu vào `images/screenshots/`.

| STT | Tên file ảnh | URL Trình duyệt | Nội dung màn hình cần hiển thị |
| :---: | :--- | :--- | :--- |
| **9** | `ui-customer-home.png` | `http://localhost:3000/` | **Trang chủ:** Carousel truyện nổi bật đầu trang, danh sách truyện mới cập nhật, thanh Header Navbar. |
| **10** | `ui-customer-browse.png` | `http://localhost:3000/browse` | **Trang Tìm kiếm:** Ô nhập từ khóa, danh sách các Tag thể loại (Fantasy, Romance...) và kết quả lọc truyện. |
| **11** | `ui-customer-story-detail.png` | `http://localhost:3000/story/slug-truyen` | **Chi tiết truyện:** Bìa truyện, Tên tác giả, Đánh giá sao, Mô tả, Nút Theo dõi và Danh sách các chương. |
| **12** | `ui-customer-reader.png` | `http://localhost:3000/slug-truyen/1` | **Đọc chương:** Tên chương, nội dung đọc văn bản, thanh điều hướng Chuyển chương trước / chương sau. |
| **13** | `ui-customer-account.png` | `http://localhost:3000/account/following` | **Cá nhân / Tủ sách:** Danh sách truyện đang theo dõi và Lịch sử các chương đã đọc. |
| **14** | `ui-admin-dashboard.png` | `http://localhost:3000/admin` | **Admin Dashboard:** Bảng điều khiển quản trị, các card số liệu thống kê tổng quan (Tổng user, tổng truyện, báo cáo...). |
| **15** | `ui-admin-users.png` | `http://localhost:3000/admin/users` | **Quản lý người dùng:** Bảng danh sách tài khoản user, cột vai trò (Admin/User/Uploader) và nút thao tác đổi Role. |
| **16** | `ui-moderator-pending-stories.png` | `http://localhost:3000/moderator/pending-stories` | **Hàng chờ kiểm duyệt:** Danh sách các truyện ở trạng thái `pending` và các nút Duyệt / Yêu cầu sửa / Từ chối. |
| **17** | `ui-admin-reports.png` | `http://localhost:3000/admin/reports` | **Quản lý báo cáo:** Danh sách báo cáo vi phạm từ độc giả, nút chọn trạng thái Đã xử lý / Bỏ qua. |
| **18** | `ui-admin-audit-logs.png` | `http://localhost:3000/admin/logs` | **Nhật ký Audit:** Bảng ghi lại lịch sử thao tác của Admin/Moderator (Actor, Action, Entity, Timestamp). |
