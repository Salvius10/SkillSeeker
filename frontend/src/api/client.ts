import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { NewsComment, Notification, SubmissionMessage } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Active session but got 401 — sign out so the user can re-authenticate
        await supabase.auth.signOut();
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const syncMe = (token: string) =>
  axios.post(`${BASE_URL}/auth/sync`, {}, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
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

// News — returns paginated response { posts, total, hasMore, limit, offset }
export const getNews = (offset = 0, limit = 20) =>
  api.get('/news', { params: { offset, limit } }).then(r => r.data);
export const reactToPost = (id: string, type: 'celebrate') =>
  api.post(`/news/${id}/react`, { type }).then(r => r.data);
export const getNewsComments = (id: string): Promise<NewsComment[]> =>
  api.get(`/news/${id}/comments`).then(r => r.data);
export const postNewsComment = (id: string, message: string): Promise<NewsComment> =>
  api.post(`/news/${id}/comments`, { message }).then(r => r.data);

// Notifications
export const getUnreadCount = (): Promise<number> =>
  api.get('/notifications/unread-count').then(r => r.data.count);
export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const markAllRead = () => api.put('/notifications/read-all').then(r => r.data);
export const markNotificationRead = (id: string) =>
  api.put(`/notifications/${id}/read`).then(r => r.data);
export const subscribeToNotifications = (token: string, callback: (data: Notification) => void): EventSource => {
  const es = new EventSource(`${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
  es.onmessage = (e) => { try { callback(JSON.parse(e.data)); } catch {} };
  return es;
};

// Analytics
export const getAnalytics = () => api.get('/analytics').then(r => r.data);

// Profile
export const getProfile = () => api.get('/profile').then(r => r.data);
