import { BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new BadRequestException(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return r.data;
}

/** +998901234567 ko'rinishiga keltiradi, noto'g'ri bo'lsa null */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  const full = d.length === 9 ? '998' + d : d;
  return /^998\d{9}$/.test(full) ? '+' + full : null;
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const orderCode = (n: number) => `TG-${1000 + n}`;
