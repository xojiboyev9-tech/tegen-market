const SERVER = process.env.SERVER_URL ?? 'http://localhost:3000';
const SECRET = process.env.BOT_SECRET ?? '';

export class ApiError extends Error {}

export async function api<T = any>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(`${SERVER}/api/bot${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-bot-secret': SECRET },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(typeof data.message === 'string' ? data.message : 'Xatolik yuz berdi');
  return data as T;
}
