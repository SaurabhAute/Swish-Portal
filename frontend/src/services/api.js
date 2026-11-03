import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('swish_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },
};

export const userService = {
  // Profile CRUD (FR-02)
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/users/profile');
    return response.data;
  },

  changePassword: async (passwords) => {
    const response = await api.put('/users/change-password', passwords);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  getAllUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
};

// ── Posts Service (FR-03, FR-04) ─────────────────────────────
export const postService = {
  /**
   * Create a new post with an image and optional caption.
   * @param {File} imageFile - The image file to upload
   * @param {string} caption - Optional caption text
   * @returns {Promise<object>} - { message, post }
   */
  createPost: async (imageFile, caption = '') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);

    const response = await api.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Fetch the campus feed (newest first, cursor-based pagination).
   * @param {{ limit?: number, cursor?: string }} params
   * @returns {Promise<{ posts: object[], nextCursor: string|null, hasMore: boolean }>}
   */
  getFeed: async (params = {}) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },

  /**
   * Fetch posts by a specific user.
   * @param {string} userId
   * @param {{ limit?: number, cursor?: string }} params
   * @returns {Promise<{ posts: object[], nextCursor: string|null, hasMore: boolean }>}
   */
  getUserPosts: async (userId, params = {}) => {
    const response = await api.get(`/posts/user/${userId}`, { params });
    return response.data;
  },

  /**
   * Delete the current user's own post.
   * @param {string} postId
   * @returns {Promise<{ message: string }>}
   */
  deletePost: async (postId) => {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
  },

  /**
   * Toggle like on a post.
   * @param {string} postId
   * @returns {Promise<{ liked: boolean, likeCount: number }>}
   */
  toggleLike: async (postId) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  /**
   * Fetch paginated comments for a post.
   * @param {string} postId
   * @param {{ limit?: number, cursor?: string }} params
   * @returns {Promise<{ comments: object[], nextCursor: string|null, hasMore: boolean }>}
   */
  getComments: async (postId, params = {}) => {
    const response = await api.get(`/posts/${postId}/comments`, { params });
    return response.data;
  },

  /**
   * Add a new comment to a post.
   * @param {string} postId
   * @param {string} text
   * @returns {Promise<object>}
   */
  addComment: async (postId, text) => {
    const response = await api.post(`/posts/${postId}/comments`, { text });
    return response.data;
  },

  /**
   * Delete a comment by ID (author only).
   * @param {string} commentId
   * @returns {Promise<{ message: string }>}
   */
  deleteComment: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
};

// ── Engagement Standalone Helpers (Person 3) ─────────────────
export const toggleLike = async (postId) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

export const getComments = async (postId, params = {}) => {
  const response = await api.get(`/posts/${postId}/comments`, { params });
  return response.data;
};

export const addComment = async (postId, text) => {
  const response = await api.post(`/posts/${postId}/comments`, { text });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};

export const followUser = async (userId) => {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
};

export const unfollowUser = async (userId) => {
  const response = await api.delete(`/users/${userId}/follow`);
  return response.data;
};

export const getFollowers = async (userId, params = {}) => {
  const response = await api.get(`/users/${userId}/followers`, { params });
  return response.data;
};

export const getFollowing = async (userId, params = {}) => {
  const response = await api.get(`/users/${userId}/following`, { params });
  return response.data;
};

export default api;
