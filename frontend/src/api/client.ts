import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// Auth
export const register = (body: { email: string; password: string; name: string; team: string; role?: string }) =>
  api.post('/auth/register', body).then(r => r.data);
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);

// Challenges
export const getChallenges = (params?: { filter?: string; minPoints?: number }) =>
  api.get('/challenges', { params }).then(r => r.data);
export const createChallenge = (body: object) =>
  api.post('/challenges', body).then(r => r.data);
export const updateChallenge = (id: string, body: object) =>
  api.put(`/challenges/${id}`, body).then(r => r.data);

// Submissions
export const getSubmissions = () => api.get('/submissions').then(r => r.data);
export const getMySubmissions = () => api.get('/submissions/my').then(r => r.data);
export const submitChallenge = (challenge_id: string, content: string) =>
  api.post('/submissions', { challenge_id, content }).then(r => r.data);
export const reviewSubmission = (id: string, status: 'approved' | 'rejected', feedback?: string) =>
  api.put(`/submissions/${id}/review`, { status, feedback }).then(r => r.data);

// Leaderboard
export const getLeaderboard = (period?: 'all' | 'month') =>
  api.get('/leaderboard', { params: period === 'month' ? { period: 'month' } : undefined }).then(r => r.data);

// News
export const getNews = () => api.get('/news').then(r => r.data);
export const reactToPost = (id: string, type: 'celebrate' | 'comment') =>
  api.post(`/news/${id}/react`, { type }).then(r => r.data);

// Notifications
export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const markAllRead = () => api.put('/notifications/read-all').then(r => r.data);

// Analytics
export const getAnalytics = () => api.get('/analytics').then(r => r.data);

// Profile
export const getProfile = () => api.get('/profile').then(r => r.data);
