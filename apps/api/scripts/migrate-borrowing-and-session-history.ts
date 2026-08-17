import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';

type CopyValue = string | null;
type SourceRow = Record<string, CopyValue>;
type CopyBlock = { columns: string[]; rows: CopyValue[][] };
type SqlArgument = string | number | null;
type SqlStatement = { sql: string; args: Record<string, SqlArgument> };

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

function required(row: SourceRow, column: string, table: string): string {
  const value = row[column];
  if (value === null || value === undefined || value === '') {
    throw new Error(`Missing ${table}.${column} in backup`);
  }
  return value;
}

function timestamp(value: CopyValue, table: string, column: string): number | null {
  if (value === null || value === '') return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid timestamp in ${table}.${column}: ${value}`);
  return parsed;
}

function jsonObject(value: CopyValue, table: string, column: string): string | null {
  if (value === null || value === '') return null;
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new Error(`Invalid JSON value in ${table}.${column}`);
  }
}

async function main() {
  const backupPath = getBackupPath();
  const blocks = parseBackup(await readFile(backupPath, 'utf8'));
  const borrowRecords = rowsFor(blocks, 'public', 'borrow_records');
  const itemActivities = rowsFor(blocks, 'public', 'item_activities');
  const supabaseSessions = rowsFor(blocks, 'auth', 'sessions');
  const statements: SqlStatement[] = [];

  for (const row of borrowRecords) {
    statements.push({
      sql: `INSERT INTO borrow_records (id, item_id, household_id, borrowed_by, borrowed_at,
          returned_at, due_at, note)
        VALUES (:id, :item_id, :household_id, :borrowed_by, :borrowed_at, :returned_at,
          :due_at, :note)
        ON CONFLICT(id) DO UPDATE SET item_id = excluded.item_id,
          household_id = excluded.household_id, borrowed_by = excluded.borrowed_by,
          borrowed_at = excluded.borrowed_at, returned_at = excluded.returned_at,
          due_at = excluded.due_at, note = excluded.note`,
      args: {
        id: required(row, 'id', 'borrow_records'),
        item_id: required(row, 'item_id', 'borrow_records'),
        household_id: required(row, 'household_id', 'borrow_records'),
        borrowed_by: required(row, 'borrowed_by', 'borrow_records'),
        borrowed_at: timestamp(row.borrowed_at, 'borrow_records', 'borrowed_at'),
        returned_at: timestamp(row.returned_at, 'borrow_records', 'returned_at'),
        due_at: timestamp(row.due_at, 'borrow_records', 'due_at'),
        note: row.note,
      },
    });
  }

  for (const row of itemActivities) {
    const action = required(row, 'action', 'item_activities');
    if (!['created', 'updated', 'moved', 'status_changed', 'attachment_added', 'attachment_removed'].includes(action)) {
      throw new Error(`Unsupported item activity action in backup: ${action}`);
    }

    statements.push({
      sql: `INSERT INTO item_activities (id, item_id, user_id, action, details, created_at)
        VALUES (:id, :item_id, :user_id, :action, :details, :created_at)
        ON CONFLICT(id) DO UPDATE SET item_id = excluded.item_id, user_id = excluded.user_id,
          action = excluded.action, details = excluded.details, created_at = excluded.created_at`,
      args: {
        id: required(row, 'id', 'item_activities'),
        item_id: required(row, 'item_id', 'item_activities'),
        user_id: required(row, 'user_id', 'item_activities'),
        action,
        details: jsonObject(row.details, 'item_activities', 'details'),
        created_at: timestamp(row.created_at, 'item_activities', 'created_at'),
      },
    });
  }

  const sourceCounts = {
    borrow_records: borrowRecords.length,
    item_activities: itemActivities.length,
    supabase_sessions: supabaseSessions.length,
  };
  const sessionPolicy =
    'Supabase auth.sessions are not copied: their refresh/session tokens are incompatible with Better Auth. Users must sign in again.';

  if (process.argv.includes('--dry-run')) {
    console.log(
      JSON.stringify(
        {
          backup: backupPath,
          dryRun: true,
          sourceCounts,
          preparedStatements: statements.length,
          sessionPolicy,
          note: 'No database writes were performed.',
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is required');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  for (let index = 0; index < statements.length; index += 100) {
    await client.batch(statements.slice(index, index + 100), 'write');
  }

  const verification = await client.batch(
    [
      { sql: 'SELECT count(*) AS count FROM borrow_records', args: {} },
      { sql: 'SELECT count(*) AS count FROM item_activities', args: {} },
    ],
    'read',
  );

  console.log(
    JSON.stringify(
      {
        backup: backupPath,
        sourceCounts,
        targetCounts: {
          borrow_records: Number(verification[0].rows[0]?.count ?? 0),
          item_activities: Number(verification[1].rows[0]?.count ?? 0),
        },
        sessionPolicy,
      },
      null,
      2,
    ),
  );
}

await main();
