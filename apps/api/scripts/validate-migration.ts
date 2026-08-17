import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';

type CopyValue = string | null;
type SourceRow = Record<string, CopyValue>;
type CopyBlock = { columns: string[]; rows: CopyValue[][] };
type ValidationSpec = {
  sourceSchema: 'public' | 'auth';
  sourceTable: string;
  targetTable: string;
  key?: string;
  sourceRows?: SourceRow[];
};

const PUBLIC_TABLES = [
  'users',
  'households',
  'memberships',
  'categories',
  'locations',
  'storage_spots',
  'items',
  'attachments',
  'item_activities',
  'borrow_records',
  'notifications',
  'notification_preferences',
] as const;

function getBackupPath(): string {
  const backupFlagIndex = process.argv.indexOf('--backup');
  const backupFromFlag = backupFlagIndex >= 0 ? process.argv[backupFlagIndex + 1] : undefined;
  const backupPath = backupFromFlag ?? process.env.POSTGRES_BACKUP_PATH;
  if (!backupPath) {
    throw new Error(
      'Provide a PostgreSQL plain-text backup with --backup <path> or POSTGRES_BACKUP_PATH.',
    );
  }
  return path.resolve(backupPath);
}

function decodeCopyValue(value: string): CopyValue {
  if (value === '\\N') return null;
  let decoded = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\' || index === value.length - 1) {
      decoded += character;
      continue;
    }
    index += 1;
    const escaped = value[index];
    decoded +=
      escaped === 'n'
        ? '\n'
        : escaped === 'r'
          ? '\r'
          : escaped === 't'
            ? '\t'
            : escaped === 'b'
              ? '\b'
              : escaped === 'f'
                ? '\f'
                : escaped === 'v'
                  ? '\v'
                  : escaped;
  }
  return decoded;
}

function parseBackup(contents: string): Map<string, CopyBlock> {
  const lines = contents.split(/\r?\n/);
  const blocks = new Map<string, CopyBlock>();
  for (let index = 0; index < lines.length; index += 1) {
    const copyMatch = /^COPY (auth|public)\.([a-z_]+) \(([^)]+)\) FROM stdin;$/.exec(
      lines[index],
    );
    if (!copyMatch) continue;

    const [, sourceSchema, table, columnsText] = copyMatch;
    const rows: CopyValue[][] = [];
    index += 1;
    while (index < lines.length && lines[index] !== '\\.') {
      if (lines[index].length > 0) rows.push(lines[index].split('\t').map(decodeCopyValue));
      index += 1;
    }
    blocks.set(`${sourceSchema}.${table}`, {
      columns: columnsText.split(',').map((column) => column.trim()),
      rows,
    });
  }
  return blocks;
}

function rowsFor(blocks: Map<string, CopyBlock>, schema: string, table: string): SourceRow[] {
  const block = blocks.get(`${schema}.${table}`);
  if (!block) return [];
  return block.rows.map((values) =>
    Object.fromEntries(block.columns.map((column, index) => [column, values[index] ?? null])),
  );
}

function booleanFlag(value: CopyValue): boolean {
  return value !== null && ['true', 't', '1'].includes(value.toLowerCase());
}

function sourceIds(rows: SourceRow[], key: string): string[] {
  return rows.flatMap((row) => {
    const value = row[key];
    return value === null || value === '' ? [] : [value];
  });
}

async function main() {
  const backupPath = getBackupPath();
  const blocks = parseBackup(await readFile(backupPath, 'utf8'));
  const sourceRows = Object.fromEntries(
    PUBLIC_TABLES.map((table) => [table, rowsFor(blocks, 'public', table)]),
  ) as Record<(typeof PUBLIC_TABLES)[number], SourceRow[]>;
  const authUsers = rowsFor(blocks, 'auth', 'users');
  const activeAuthUserIds = new Set(
    authUsers
      .filter((row) => !row.deleted_at && !booleanFlag(row.is_anonymous))
      .flatMap((row) => (row.id ? [row.id] : [])),
  );
  const identities = rowsFor(blocks, 'auth', 'identities').filter((row) =>
    row.user_id ? activeAuthUserIds.has(row.user_id) : false,
  );

  const specs: ValidationSpec[] = [
    ...PUBLIC_TABLES.map((table) => ({
      sourceSchema: 'public' as const,
      sourceTable: table,
      targetTable: table,
      key: table === 'notification_preferences' ? 'user_id' : 'id',
      sourceRows: sourceRows[table],
    })),
    {
      sourceSchema: 'auth',
      sourceTable: 'identities',
      targetTable: 'accounts',
      sourceRows: identities,
    },
  ];

  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is required');
  const database = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const checks = [];

  for (const spec of specs) {
    const rows = spec.sourceRows ?? [];
    const targetResult = await database.execute(`SELECT count(*) AS count FROM ${spec.targetTable}`);
    const targetCount = Number(targetResult.rows[0]?.count ?? 0);
    const sourceCount = rows.length;
    const missingIds: string[] = [];

    if (spec.key) {
      const sourceKeySet = new Set(sourceIds(rows, spec.key));
      const targetKeysResult = await database.execute(`SELECT ${spec.key} AS key FROM ${spec.targetTable}`);
      const targetKeySet = new Set(targetKeysResult.rows.map((row) => String(row.key)));
      for (const key of sourceKeySet) {
        if (!targetKeySet.has(key)) missingIds.push(key);
      }
    }

    checks.push({
      source: `${spec.sourceSchema}.${spec.sourceTable}`,
      target: spec.targetTable,
      sourceCount,
      targetCount,
      status: targetCount < sourceCount || missingIds.length > 0 ? 'missing' : targetCount === sourceCount ? 'match' : 'target-ahead',
      missingIdCount: missingIds.length,
      missingIdSample: missingIds.slice(0, 10),
    });
  }

  const failures = checks.filter((check) => check.status === 'missing');
  const report = {
    backup: backupPath,
    passed: failures.length === 0,
    checks,
    skipped: {
      supabaseSessions: rowsFor(blocks, 'auth', 'sessions').length,
      reason: 'Supabase session tokens are not compatible with Better Auth; users must sign in again.',
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0 && !process.argv.includes('--report-only')) process.exitCode = 1;
}

await main();
