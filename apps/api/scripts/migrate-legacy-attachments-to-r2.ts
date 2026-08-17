import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { objectStorage } from '../src/config/object-storage.js';

type LegacyAttachment = {
  id: string;
  item_id: string;
  household_id: string;
  object_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function numericOption(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

function safeFileName(fileName: string): string {
  const safe = fileName.replace(/[\\/\0]/g, '_').trim();
  return (safe || 'upload').slice(0, 255);
}

function legacyObjectUrl(objectKey: string): string {
  const configuredBase = process.env.LEGACY_STORAGE_PUBLIC_URL;
  const legacySupabaseUrl = process.env.LEGACY_SUPABASE_URL;
  const base = configuredBase ?? (legacySupabaseUrl
    ? `${legacySupabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/attachments`
    : undefined);

  if (!base) {
    throw new Error(
      'Set LEGACY_STORAGE_PUBLIC_URL (or LEGACY_SUPABASE_URL) before migrating legacy attachments.',
    );
  }

  const encodedPath = objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base.replace(/\/$/, '')}/${encodedPath}`;
}

function localLegacyObjectPaths(objectKey: string): string[] {
  const exportRoot = process.env.LEGACY_STORAGE_EXPORT_DIR;
  if (!exportRoot) return [];

  const segments = objectKey.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Invalid legacy object key: ${objectKey}`);
  }

  const root = path.resolve(exportRoot);
  const projectRef = process.env.LEGACY_SUPABASE_PROJECT_REF;
  const prefixes = [
    [],
    ['attachments'],
    ...(projectRef ? [[projectRef], [projectRef, 'attachments']] : []),
  ];
  return prefixes
    .map((prefix) => path.resolve(root, ...prefix, ...segments))
    .filter((candidate) => {
      const relative = path.relative(root, candidate);
      return relative !== '' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });
}

async function readLocalLegacyObject(objectKey: string): Promise<Buffer | null> {
  if (!process.env.LEGACY_STORAGE_EXPORT_DIR) return null;

  for (const candidate of localLegacyObjectPaths(objectKey)) {
    try {
      return await readFile(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  throw new Error(`Legacy storage export does not contain ${objectKey}`);
}

async function downloadLegacyObject(attachment: LegacyAttachment): Promise<Buffer> {
  const localObject = await readLocalLegacyObject(attachment.object_key);
  if (localObject) return localObject;

  const token = process.env.LEGACY_STORAGE_BEARER_TOKEN;
  const headers = token
    ? { Authorization: `Bearer ${token}`, apikey: token }
    : undefined;
  const response = await fetch(legacyObjectUrl(attachment.object_key), {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Legacy object download failed (${response.status}) for attachment ${attachment.id}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const dryRun = flag('--dry-run');
  const limit = numericOption('--limit', 100);
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (!databaseUrl) throw new Error('TURSO_DATABASE_URL is required');

  const database = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const result = await database.execute({
    sql: `SELECT a.id, a.item_id, i.household_id, a.object_key, a.file_name,
        a.mime_type, a.size_bytes
      FROM attachments a
      INNER JOIN items i ON i.id = a.item_id
      WHERE a.bucket = 'legacy-supabase'
      ORDER BY a.created_at ASC
      LIMIT ?`,
    args: [limit],
  });
  const attachments = result.rows as unknown as LegacyAttachment[];

  if (attachments.length === 0) {
    console.log(
      JSON.stringify({
        dryRun,
        migrated: 0,
        skipped: 0,
        qrAssetsMigrated: 0,
        qrAssetStrategy: 'Generated on demand from items.qr_token; no QR blobs are stored.',
        message: 'No legacy attachments remain.',
      }),
    );
    return;
  }

  if (!dryRun && !objectStorage.isConfigured) {
    throw new Error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
    );
  }

  let completed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const attachment of attachments) {
    const targetKey = `${attachment.household_id}/${attachment.item_id}/${attachment.id}_${safeFileName(attachment.file_name)}`;
    try {
      if (!dryRun) {
        const body = await downloadLegacyObject(attachment);
        await objectStorage.put(targetKey, body, attachment.mime_type);
        await database.execute({
          sql: `UPDATE attachments
            SET bucket = ?, object_key = ?, size_bytes = ?
            WHERE id = ? AND bucket = 'legacy-supabase'`,
          args: [objectStorage.bucket, targetKey, body.byteLength, attachment.id],
        });
      }
      completed += 1;
      console.log(`${dryRun ? 'would-migrate' : 'migrated'} ${attachment.id} -> ${targetKey}`);
    } catch (error) {
      failures.push({
        id: attachment.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`failed ${attachment.id}: ${failures.at(-1)?.error}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        inspected: attachments.length,
        ...(dryRun ? { planned: completed } : { migrated: completed }),
        qrAssetsMigrated: 0,
        qrAssetStrategy: 'Generated on demand from items.qr_token; no QR blobs are stored.',
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) process.exitCode = 1;
}

await main();
