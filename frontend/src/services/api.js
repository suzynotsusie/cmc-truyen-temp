import axios from 'axios';

// Các key dùng để lưu token và thông tin user vào localStorage
// Dùng prefix 'cmc_' để tránh xung đột với các ứng dụng khác cùng domain
const storageKeys = {
  token: 'cmc_token',
  user: 'cmc_user',
};

/**
 * Xác định URL gốc của API backend.
 * Hỗ trợ 2 tên biến môi trường (Vite và Create React App) để tương thích rộng hơn.
 * Fallback về localhost:5000 khi không tìm thấy biến môi trường (môi trường development).
 */
function getBaseURL() {
  return (
    import.meta.env.VITE_API_URL ||       // Vite environment variable
    import.meta.env.REACT_APP_API_URL ||  // Create React App (legacy)
    'http://localhost:5000/api'
  );
}

/**
 * Lấy JWT token từ localStorage.
 * Bao bởi try/catch vì localStorage có thể bị chặn trong incognito mode
 * hoặc khi browser settings ngăn third-party storage.
 */
function getToken() {
  try {
    return localStorage.getItem(storageKeys.token);
  } catch {
    return null;
  }
}

/**
 * Xóa thông tin xác thực khỏi localStorage (dùng khi đăng xuất hoặc token hết hạn).
 */
function clearAuthStorage() {
  try {
    localStorage.removeItem(storageKeys.token);
    localStorage.removeItem(storageKeys.user);
  } catch {
    // ignore - nếu không xóa được thì cũng không nghiêm trọng
  }
}

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
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response Interceptor: Xử lý tự động khi server trả về lỗi 401 (Unauthorized).
 * Chạy SAU KHI nhận response lỗi từ server.
 *
 * Khi nhận 401:
 * - Xóa thông tin xác thực đã lưu (token đã hết hạn hoặc không hợp lệ)
 * - Chuyển hướng về trang đăng nhập
 * - NGOẠI LỆ: Không redirect khi đang ở trang login/register/home
 *   (tránh vòng lặp redirect vô hạn)
 */
apiClient.interceptors.response.use(
  (response) => response, // Nếu thành công, trả về nguyên response
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;

      // Chỉ redirect nếu KHÔNG đang ở các trang public (login, register, home)
      // Tránh redirect loop: login page nhận 401 → redirect về login → lại nhận 401 → ...
      if (!path.startsWith('/login') && !path.startsWith('/register') && path !== '/') {
        clearAuthStorage();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Hàm wrapper gọi API và trả về chỉ data (không phải toàn bộ axios response).
 * Giúp controller/component đơn giản hơn khi dùng: không cần .data mỗi lần.
 */
async function request(path, options = {}) {
  const response = await apiClient.request({ url: path, ...options });
  return response.data;
}

/**
 * Object API tập trung toàn bộ các endpoint của ứng dụng.
 * Cấu trúc theo domain: auth, stories, chapters, comments, ai, readingHistory, follows, preferences, upload, tags, admin.
 * Giúp dễ tìm và quản lý các API call trong toàn bộ codebase frontend.
 */
const API = {
  // ── Xác thực người dùng ──────────────────────────────────────────────────
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', data }),
    login: (data) => request('/auth/login', { method: 'POST', data }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getCurrentUser: () => request('/auth/me', { method: 'GET' }),  // Lấy thông tin user hiện tại từ JWT
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', data }),
  },

  // ── Quản lý truyện ───────────────────────────────────────────────────────
  stories: {
    getAll: (page = 1, limit = 10, sortBy = 'newest') => request('/stories', { method: 'GET', params: { page, limit, sortBy } }),
    getMine: (page = 1, limit = 20) => request('/stories/mine', { method: 'GET', params: { page, limit } }),
    getById: (id) => request(`/stories/${id}`, { method: 'GET' }),
    create: (data) => request('/stories', { method: 'POST', data }),
    update: (id, data) => request(`/stories/${id}`, { method: 'PUT', data }),
    delete: (id) => request(`/stories/${id}`, { method: 'DELETE' }),
    // Tìm kiếm với nhiều bộ lọc: từ khóa, thể loại, tag, pagination
    search: (query, category = null, tag = null, page = 1, limit = 12) => request('/stories/search', {
      method: 'GET',
      params: {
        q: query || undefined,           // Bỏ qua param nếu rỗng (không gửi ?q= lên server)
        category: category || undefined,
        tag: tag || undefined,
        page,
        limit,
      },
    }),
  },

  // ── Quản lý chương ───────────────────────────────────────────────────────
  chapters: {
    getByStory: (storyId, page = 1, limit = 10, sort = 'asc') => request(`/stories/${storyId}/chapters`, { method: 'GET', params: { page, limit, sort } }),
    getById: (storyId, chapterId) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'GET' }),
    create: (storyId, data) => request(`/stories/${storyId}/chapters`, { method: 'POST', data }),
    update: (storyId, chapterId, data) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'PUT', data }),
    delete: (storyId, chapterId) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'DELETE' }),
    report: (storyId, chapterId, data) => request(`/stories/${storyId}/chapters/${chapterId}/report`, { method: 'POST', data }),
  },

  // ── Bình luận ────────────────────────────────────────────────────────────
  comments: {
    getByStory: (storyId) => request(`/comments/story/${storyId}`, { method: 'GET' }),
    // storyId tùy chọn khi lấy comment theo chapter (để lọc thêm nếu cần)
    getByChapter: (chapterId, storyId) => request(`/comments/chapter/${chapterId}`, {
      method: 'GET',
      params: storyId ? { story_id: storyId } : undefined,
    }),
    create: (data) => request('/comments', { method: 'POST', data }),
    delete: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  },

  // ── AI features ──────────────────────────────────────────────────────────
  ai: {
    // generateSummary: Tóm tắt chapter bằng AI; regenerate=true bỏ qua cache và tạo lại
    generateSummary: (chapterId, regenerate = false) => request(`/chapters/${chapterId}/summary`, {
      method: 'GET',
      params: regenerate ? { regenerate: 'true' } : undefined,
    }),
    getRecommendations: () => request('/ai/recommendations', { method: 'GET' }),
  },

  // ── Lịch sử đọc ──────────────────────────────────────────────────────────
  readingHistory: {
    save: (data) => request('/reading-history', { method: 'POST', data }), // Lưu tiến trình đọc
    getAll: () => request('/reading-history', { method: 'GET' }),
    getStoryProgress: (storyId) => request(`/reading-history/story/${storyId}`, { method: 'GET' }),
  },

  // ── Theo dõi truyện ──────────────────────────────────────────────────────
  follows: {
    getAll: () => request('/follows', { method: 'GET' }),
    check: (storyId) => request(`/follows/check/${storyId}`, { method: 'GET' }), // Kiểm tra đã follow chưa
    follow: (storyId) => request(`/follows/${storyId}`, { method: 'POST' }),
    unfollow: (storyId) => request(`/follows/${storyId}`, { method: 'DELETE' }),
  },

  // ── Cài đặt đọc truyện ───────────────────────────────────────────────────
  preferences: {
    get: () => request('/preferences', { method: 'GET' }),
    update: (data) => request('/preferences', { method: 'PUT', data }),
  },

  // ── Upload file ───────────────────────────────────────────────────────────
  upload: {
    // Upload ảnh bìa: dùng FormData và Content-Type multipart/form-data (khác với JSON)
    cover: async (file) => {
      const formData = new FormData();
      formData.append('cover', file); // 'cover' phải khớp với tên field multer đang listen
      const response = await apiClient.post('/upload/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Override default JSON header
      });
      return response.data;
    },
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  tags: {
    getAll: () => request('/tags', { method: 'GET' }),
    create: (name) => request('/tags', { method: 'POST', data: { name } }),
  },

  // ── Quản trị (Admin only) ─────────────────────────────────────────────────
  admin: {
    getStats: () => request('/admin/stats', { method: 'GET' }),
    getUsers: () => request('/admin/users', { method: 'GET' }),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', data: { role } }),
    deleteComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
    getStories: (page = 1) => request('/admin/stories', { method: 'GET', params: { page, limit: 50 } }),
  },
};

// Export apiClient để một số component có thể dùng trực tiếp (ví dụ: upload với progress tracking)
export { apiClient };
export default API;
