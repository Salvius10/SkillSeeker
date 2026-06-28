import { Response } from 'express';

const map = new Map<string, Set<Response>>();

export const sseManager = {
  add(userId: string, res: Response) {
    if (!map.has(userId)) map.set(userId, new Set());
    map.get(userId)!.add(res);
  },
  remove(userId: string, res: Response) {
    map.get(userId)?.delete(res);
  },
  emit(userId: string, data: object) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    const conns = map.get(userId);
    if (!conns) return;
    for (const res of conns) {
      try { res.write(payload); }
      catch { conns.delete(res); } // stale connection — remove it
    }
  },
};
