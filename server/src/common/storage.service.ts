import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { env } from './env';

// Faqat haqiqiy rasm fayllari (magic bytes bo'yicha), mimetype'ga ishonilmaydi
function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return { ext: 'webp', mime: 'image/webp' };
  return null;
}

@Injectable()
export class StorageService {
  async saveImage(buf: Buffer): Promise<string> {
    const t = sniff(buf);
    if (!t) throw new BadRequestException('Faqat JPG, PNG yoki WEBP rasm yuklash mumkin');
    const name = `${randomBytes(16).toString('hex')}.${t.ext}`;

    if (env.gcsBucket) {
      const { Storage } = await import('@google-cloud/storage');
      const file = new Storage().bucket(env.gcsBucket).file(`products/${name}`);
      await file.save(buf, { contentType: t.mime, resumable: false, metadata: { cacheControl: 'public, max-age=31536000' } });
      return `https://storage.googleapis.com/${env.gcsBucket}/products/${name}`;
    }
    await mkdir(env.uploadDir, { recursive: true });
    await writeFile(join(env.uploadDir, name), buf);
    return `${env.publicBaseUrl}/uploads/${name}`;
  }
}
