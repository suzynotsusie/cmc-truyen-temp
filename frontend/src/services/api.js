import axios from 'axios';
import { localizeApiError } from '../utils/apiError';

const storageKeys = {
  token: 'cmc_token',
  user: 'cmc_user',
};

function getBaseURL() {
  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.REACT_APP_API_URL ||
    'http://localhost:5000/api'
  );
}

function clearAuthStorage() {
  try {
    localStorage.removeItem(storageKeys.token);
    localStorage.removeItem(storageKeys.user);
  } catch {
  }
}

const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('cmc_token');
    if (token && token !== 'null') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    localizeApiError(error);
    if (
      (error?.response?.status === 401 || error?.response?.status === 403)
      && error?.response?.data?.code !== 'CHAPTER_LOCKED'
      && typeof window !== 'undefined'
    ) {
      const path = window.location.pathname;

      if (!path.startsWith('/login') && !path.startsWith('/register') && path !== '/') {
        clearAuthStorage();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

async function request(path, options = {}) {
  const response = await apiClient({
    url: path,
    method: options.method || 'GET',
    params: options.params,
    data: options.data,
  });
  return response.data;
}

const API = {
  auditLogs: {
    get: (params = {}) => request('/audit-logs', { method: 'GET', params }),
  },
  wallet: {
    get: (page = 1, limit = 20) => request('/wallet', { method: 'GET', params: { page, limit } }),
  },
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', data }),
    login: (data) => request('/auth/login', { method: 'POST', data }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getCurrentUser: () => request('/auth/me', { method: 'GET' }),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', data }),
    googleLogin: (idToken) => request('/auth/google', { method: 'POST', data: { idToken } }),
    googleComplete: (data) => request('/auth/google/complete', { method: 'POST', data }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', data: { email } }),
    verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', data: { email, otp } }),
    resetPassword: (data) => request('/auth/reset-password', { method: 'POST', data }),
    changePassword: (data) => request('/auth/change-password', { method: 'PUT', data }),
  },

  stories: {
    getAll: (page = 1, limit = 10, sortBy = 'newest') => request('/stories', { method: 'GET', params: { page, limit, sortBy } }),
    getMine: (page = 1, limit = 20) => request('/stories/mine', { method: 'GET', params: { page, limit } }),
    getById: (id) => request(`/stories/${id}`, { method: 'GET' }),
    getBySlug: (slug) => request(`/stories/by-slug/${slug}`, { method: 'GET' }),
    create: (data) => request('/stories', { method: 'POST', data }),
    createFromFile: async (payload, file) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, item));
        } else {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.post('/stories/import-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    update: (id, data) => request(`/stories/${id}`, { method: 'PUT', data }),
    delete: (id) => request(`/stories/${id}`, { method: 'DELETE' }),
    toggleVisibility: (id) => request(`/stories/${id}/visibility`, { method: 'PATCH' }),
    getRating: (id) => request(`/stories/${id}/rating`, { method: 'GET' }),
    rate: (id, rating) => request(`/stories/${id}/rating`, { method: 'PUT', data: { rating } }),
    deleteRating: (id) => request(`/stories/${id}/rating`, { method: 'DELETE' }),
    getCollaborators: (storyId) => request(`/stories/${storyId}/collaborators`, { method: 'GET' }),
    addCollaborator: (storyId, data) => request(`/stories/${storyId}/collaborators`, { method: 'POST', data }),
    removeCollaborator: (storyId, userId) => request(`/stories/${storyId}/collaborators/${userId}`, { method: 'DELETE' }),
    search: (query, category = null, tag = null, page = 1, limit = 12) => request('/stories/search', {
      method: 'GET',
      params: {
        q: query || undefined,
        category: category || undefined,
        tag: tag || undefined,
        page,
        limit,
      },
    }),
  },
  rankings: {
    get: (type = 'trending', period = 'week', limit = 20) => request('/rankings', {
      method: 'GET',
      params: { type, period, limit },
    }),
  },

  chapters: {
    getByStory: (storyId, page = 1, limit = 10, sort = 'asc') => request(`/stories/${storyId}/chapters`, { method: 'GET', params: { page, limit, sort } }),
    getById: (storyId, chapterId) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'GET' }),
    getBySlugAndNumber: (storySlug, chapterNumber) => request(`/stories/by-slug/${storySlug}/chapters/${chapterNumber}`, { method: 'GET' }),
    unlock: (chapterId) => request(`/chapters/${chapterId}/unlock`, { method: 'POST' }),
    create: (storyId, data) => request(`/stories/${storyId}/chapters`, { method: 'POST', data }),
    previewFile: async (storyId, payload, file) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        formData.append(key, String(value));
      });

      const response = await apiClient.post(`/stories/${storyId}/chapters/preview-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    importFromFile: async (storyId, payload, file) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        formData.append(key, String(value));
      });

      const response = await apiClient.post(`/stories/${storyId}/chapters/import-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    update: (storyId, chapterId, data) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'PUT', data }),
    delete: (storyId, chapterId) => request(`/stories/${storyId}/chapters/${chapterId}`, { method: 'DELETE' }),
  },

  comments: {
    getByStory: (storyId) => request(`/comments/story/${storyId}`, { method: 'GET' }),
    getByChapter: (chapterId, storyId) => request(`/comments/chapter/${chapterId}`, {
      method: 'GET',
      params: storyId ? { story_id: storyId } : undefined,
    }),
    create: (data) => request('/comments', { method: 'POST', data }),
    vote: (id, value) => request(`/comments/${id}/vote`, { method: 'POST', data: { value } }),
    delete: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
    
    getOriginal: (id) => request(`/comments/${id}/original`, { method: 'GET' }),
  },


  ai: {
    generateSummary: (chapterId, regenerate = false) => request(`/chapters/${chapterId}/summary`, {
      method: 'GET',
      params: regenerate ? { regenerate: 'true' } : undefined,
    }),
    getRecommendations: (limit = 10) => request('/ai/recommendations', { method: 'GET', params: { limit } }),
  },
  readingHistory: {
    save: (data) => request('/reading-history', { method: 'POST', data }),
    getAll: () => request('/reading-history', { method: 'GET' }),
    getStoryProgress: (storyId) => request(`/reading-history/story/${storyId}`, { method: 'GET' }),
    getReadChapters: (storyId) => request(`/reading-history/story/${storyId}/read-chapters`, { method: 'GET' }),
  },
  follows: {
    getAll: () => request('/follows', { method: 'GET' }),
    check: (storyId) => request(`/follows/check/${storyId}`, { method: 'GET' }),
    follow: (storyId) => request(`/follows/${storyId}`, { method: 'POST' }),
    unfollow: (storyId) => request(`/follows/${storyId}`, { method: 'DELETE' }),
  },
  notifications: {
    getAll: (page = 1, limit = 10) => request('/notifications', { method: 'GET', params: { page, limit } }),
    getUnreadCount: () => request('/notifications/unread-count', { method: 'GET' }),
    markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
    delete: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
    deleteAll: () => request('/notifications', { method: 'DELETE' }),
    getPreferences: () => request('/notifications/preferences/me', { method: 'GET' }),
    updatePreferences: (data) => request('/notifications/preferences/me', { method: 'PATCH', data }),
  },
  preferences: {
    get: () => request('/preferences', { method: 'GET' }),
    update: (data) => request('/preferences', { method: 'PUT', data }),
  },
  reports: {
    create: (data) => request('/reports', { method: 'POST', data }),
    getAll: (params = {}) => request('/reports', { method: 'GET', params }),
    updateStatus: (id, status) => request(`/reports/${id}`, { method: 'PATCH', data: { status } }),
    process: (id, action, note = '') => request(`/reports/${id}/process`, {
      method: 'PATCH',
      data: { action, note },
    }),
  },
  moderator: {
    getDashboard: () => request('/moderator/dashboard', { method: 'GET' }),
    getPendingStories: (page = 1, limit = 20) => request('/moderator/pending-stories', { method: 'GET', params: { page, limit } }),
    approvePendingStory: (id) => request(`/moderator/pending-stories/${id}/approve`, { method: 'PATCH' }),
    processPendingStory: (id, action, note = '') => request(`/moderator/pending-stories/${id}/process`, {
      method: 'PATCH',
      data: { action, note },
    }),
    getComments: (params = {}) => request('/moderator/comments', { method: 'GET', params }),
    updateCommentStatus: (id, status) => request(`/moderator/comments/${id}/status`, { method: 'PATCH', data: { status } }),
    getProfiles: (status) => request('/moderator/profiles', { method: 'GET', params: status ? { status } : undefined }),
    processProfileAvatar: (id, action, note = '') => request(`/moderator/profiles/${id}/avatar`, {
      method: 'PATCH',
      data: { action, note },
    }),
  },
  upload: {
    cover: async (file) => {
      const formData = new FormData();
      formData.append('cover', file);
      const response = await apiClient.post('/upload/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
  },
  tags: {
    getAll: () => request('/tags', { method: 'GET' }),
    create: (name) => request('/tags', { method: 'POST', data: { name } }),
  },
  admin: {
    getStats: () => request('/admin/stats', { method: 'GET' }),
    getUsers: (search = '') => request('/admin/users', { method: 'GET', params: { search: search || undefined } }),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', data: { role } }),
    updateUserStatus: (id, isActive) => request(`/admin/users/${id}/status`, { method: 'PATCH', data: { is_active: isActive } }),
    deleteComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
    getStories: (page = 1, limit = 50) => request('/admin/stories', { method: 'GET', params: { page, limit } }),
    getReports: (status = 'ALL', page = 1) => 
      request('/reports', { method: 'GET', params: { status, page, limit: 50 } }),
  },
  payouts: {
    request: (data) => request('/payouts/request', { method: 'POST', data }),
    getMyRequests: () => request('/payouts/my-requests', { method: 'GET' }),
    getAllAdmin: () => request('/payouts/admin/all', { method: 'GET' }),
    processAdmin: (id, action) => request(`/payouts/admin/process/${id}`, { method: 'PUT', data: { action } }),
  },
  badWords: {
    getAll: () => request('/admin/bad-words', { method: 'GET' }),
    create: (data) => request('/admin/bad-words', { method: 'POST', data }),
    update: (id, data) => request(`/admin/bad-words/${id}`, { method: 'PATCH', data }),
    delete: (id) => request(`/admin/bad-words/${id}`, { method: 'DELETE' }),
  },
};

export { apiClient };
export default API;
