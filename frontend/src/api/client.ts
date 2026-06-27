import axios from 'axios';
import type { Notification, SubmissionMessage } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

const api = axios.create({ baseURL: BASE_URL });

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

// Picks
export const getMyPicks = (): Promise<string[]> =>
  api.get('/picks/my').then(r => r.data);
export const pickChallenge = (id: string) =>
  api.post('/picks', { challenge_id: id }).then(r => r.data);
export const unpickChallenge = (id: string) =>
  api.delete(`/picks/${id}`).then(r => r.data);

// Submissions
export const getSubmissions = () => api.get('/submissions').then(r => r.data);
export const getMySubmissions = () => api.get('/submissions/my').then(r => r.data);
export const submitChallenge = (challenge_id: string, content: string, submission_type?: string) =>
  api.post('/submissions', { challenge_id, content, submission_type }).then(r => r.data);
export const reviewSubmission = (id: string, status: 'approved' | 'rejected', feedback?: string) =>
  api.put(`/submissions/${id}/review`, { status, feedback }).then(r => r.data);
export const getSubmissionMessages = (id: string): Promise<SubmissionMessage[]> =>
  api.get(`/submissions/${id}/messages`).then(r => r.data);
export const postSubmissionMessage = (id: string, message: string): Promise<SubmissionMessage> =>
  api.post(`/submissions/${id}/messages`, { message }).then(r => r.data);
export const resubmitChallenge = (id: string, content: string, submission_type?: string) =>
  api.put(`/submissions/${id}/resubmit`, { content, submission_type }).then(r => r.data);

// Challenge social thread
export const getChallengeComments = (challengeId: string) =>
  api.get(`/challenges/${challengeId}/comments`).then(r => r.data);
export const postChallengeComment = (challengeId: string, message: string) =>
  api.post(`/challenges/${challengeId}/comments`, { message }).then(r => r.data);
export const toggleCommentLike = (challengeId: string, commentId: string) =>
  api.post(`/challenges/${challengeId}/comments/${commentId}/like`).then(r => r.data);

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
export const markNotificationRead = (id: string) =>
  api.put(`/notifications/${id}/read`).then(r => r.data);
export const subscribeToNotifications = (callback: (data: Notification) => void): EventSource => {
  const token = localStorage.getItem('ss_token');
  const es = new EventSource(`${BASE_URL}/notifications/stream?token=${encodeURIComponent(token ?? '')}`);
  es.onmessage = (e) => { try { callback(JSON.parse(e.data)); } catch {} };
  return es;
};

// Analytics
export const getAnalytics = () => api.get('/analytics').then(r => r.data);

// Profile
export const getProfile = () => api.get('/profile').then(r => r.data);
