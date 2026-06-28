import { supabase } from '../db';
import { sseManager } from './sseManager';

export async function notify(userId: string, type: string, message: string) {
  const { data } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, message })
    .select()
    .single();
  if (data) sseManager.emit(userId, data);
}

export async function notifyUsers(userIds: string[], type: string, message: string) {
  if (!userIds.length) return;
  const { data: notifs } = await supabase
    .from('notifications')
    .insert(userIds.map(id => ({ user_id: id, type, message })))
    .select();
  for (const n of notifs ?? []) sseManager.emit(n.user_id, n);
}

export async function notifyAdmins(type: string, message: string) {
  const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
  if (!admins?.length) return;
  await notifyUsers(admins.map(a => a.id), type, message);
}

export async function notifyAllEmployees(type: string, message: string) {
  const { data: employees } = await supabase.from('users').select('id').eq('role', 'employee');
  if (!employees?.length) return;
  await notifyUsers(employees.map(e => e.id), type, message);
}
