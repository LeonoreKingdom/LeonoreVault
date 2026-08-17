import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

let client: S3Client | null = null;
export const R2_SIGNED_URL_TTL_SECONDS = 300;

function validateKey(key: string): string {
  const normalized = key.trim();
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error('Invalid object storage key');
  }
  if (normalized.length > 1024) {
    throw new Error('Object storage key is too long');
  }
  return normalized;
}

function publicUrl(key: string): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  const encodedPath = validateKey(key)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${encodedPath}`;
}

function safeContentDisposition(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const safeName = fileName.replace(/["\r\n]/g, '_').slice(0, 255) || 'download';
  return `inline; filename="${safeName}"`;
}

function getClient(): S3Client {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export const objectStorage = {
  bucket: env.R2_BUCKET,
  isConfigured: Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY),
  publicUrl,

  async signedUrl(
    key: string,
    options: { expiresIn?: number; contentType?: string; fileName?: string } = {},
  ) {
    const normalizedKey = validateKey(key);
    const expiresIn = Math.max(
      60,
      Math.min(options.expiresIn ?? R2_SIGNED_URL_TTL_SECONDS, 3600),
    );
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: normalizedKey,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: safeContentDisposition(options.fileName),
    });
    return getSignedUrl(getClient(), command, { expiresIn });
  },

  async put(key: string, body: Buffer, contentType: string) {
    const normalizedKey = validateKey(key);
    await getClient().send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: normalizedKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key: normalizedKey, url: publicUrl(normalizedKey) };
  },

  async remove(key: string) {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: validateKey(key) }),
    );
  },
};
