import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@libsql/client';

type CopyValue = string | null;
type SourceRow = Record<string, CopyValue>;
type CopyBlock = {
  columns: string[];
  rows: CopyValue[][];
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

function splitCopyRow(line: string): CopyValue[] {
  return line.split('\t').map(decodeCopyValue);
}

function parseBackup(contents: string): Map<string, CopyBlock> {
  const lines = contents.split(/\r?\n/);
  const blocks = new Map<string, CopyBlock>();

  for (let index = 0; index < lines.length; index += 1) {
    const copyMatch = /^COPY (public|storage)\.([a-z_]+) \(([^)]+)\) FROM stdin;$/.exec(
      lines[index],
    );
    if (!copyMatch) continue;

    const [, schema, table, columnsText] = copyMatch;
    const rows: CopyValue[][] = [];
    index += 1;

    while (index < lines.length && lines[index] !== '\\.') {
      if (lines[index].length > 0) rows.push(splitCopyRow(lines[index]));
      index += 1;
    }

    blocks.set(`${schema}.${table}`, {
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

function integer(value: CopyValue): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid integer value: ${value}`);
  return parsed;
}

function boolean(value: CopyValue, table: string, column: string): number | null {
  if (value === null || value === '') return null;
  if (['true', 't', '1'].includes(value.toLowerCase())) return 1;
  if (['false', 'f', '0'].includes(value.toLowerCase())) return 0;
  throw new Error(`Invalid boolean in ${table}.${column}: ${value}`);
}

function parsePostgresArray(value: string | null): string[] {
  if (!value || value === '{}') return [];
  if (!value.startsWith('{') || !value.endsWith('}')) {
    throw new Error(`Unsupported PostgreSQL array value: ${value}`);
  }

  const values: string[] = [];
  let current = '';
  let quoted = false;
  let escaped = false;

  for (const character of value.slice(1, -1)) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function jsonObject(value: CopyValue): string | null {
  if (value === null || value === '') return null;
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new Error(`Invalid JSON value in backup: ${value}`);
  }
}

function stableToken(namespace: string, id: string): string {
  return createHash('sha256').update(`${namespace}:${id}`).digest('hex').slice(0, 32);
}

function parentFirst(rows: SourceRow[], table: string): SourceRow[] {
  const pending = [...rows];
  const ordered: SourceRow[] = [];
  const imported = new Set<string>();

  while (pending.length > 0) {
    const readyIndex = pending.findIndex((row) => {
      const parentId = row.parent_id;
      return parentId === null || parentId === '' || imported.has(parentId);
    });

    if (readyIndex < 0) {
      throw new Error(`Could not resolve parent hierarchy in ${table}`);
    }

    const [row] = pending.splice(readyIndex, 1);
    ordered.push(row);
    imported.add(required(row, 'id', table));
  }

  return ordered;
}

function storageObjectSizes(blocks: Map<string, CopyBlock>): Map<string, number> {
  const result = new Map<string, number>();
  for (const row of rowsFor(blocks, 'storage', 'objects')) {
    const bucket = row.bucket_id;
    const objectKey = row.name;
    if (!bucket || !objectKey) continue;

    const sizeMatch = row.metadata?.match(/"(?:size|contentLength)"\s*:\s*(\d+)/);
    result.set(`${bucket}:${objectKey}`, sizeMatch ? Number(sizeMatch[1]) : 0);
  }
  return result;
}

type SqlArgument = string | number | null;
type SqlStatement = { sql: string; args: Record<string, SqlArgument> };

async function main() {
  const backupPath = getBackupPath();
  const contents = await readFile(backupPath, 'utf8');
  const blocks = parseBackup(contents);
  const sourceRows = Object.fromEntries(
    PUBLIC_TABLES.map((table) => [table, rowsFor(blocks, 'public', table)]),
  ) as Record<(typeof PUBLIC_TABLES)[number], SourceRow[]>;
  const objectSizes = storageObjectSizes(blocks);
  const statements: SqlStatement[] = [];

  for (const row of sourceRows.users) {
    statements.push({
      sql: `INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
        VALUES (:id, :email, :display_name, :avatar_url, :created_at, :updated_at)
        ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
          avatar_url = excluded.avatar_url, created_at = excluded.created_at, updated_at = excluded.updated_at`,
      args: {
        id: required(row, 'id', 'users'),
        email: required(row, 'email', 'users'),
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        created_at: timestamp(row.created_at, 'users', 'created_at'),
        updated_at: timestamp(row.updated_at, 'users', 'updated_at'),
      },
    });
  }

  for (const row of sourceRows.households) {
    statements.push({
      sql: `INSERT INTO households (id, name, created_by, invite_code, invite_expires_at, created_at)
        VALUES (:id, :name, :created_by, :invite_code, :invite_expires_at, :created_at)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, created_by = excluded.created_by,
          invite_code = excluded.invite_code, invite_expires_at = excluded.invite_expires_at,
          created_at = excluded.created_at`,
      args: {
        id: required(row, 'id', 'households'),
        name: required(row, 'name', 'households'),
        created_by: required(row, 'created_by', 'households'),
        invite_code: row.invite_code,
        invite_expires_at: timestamp(row.invite_expires_at, 'households', 'invite_expires_at'),
        created_at: timestamp(row.created_at, 'households', 'created_at'),
      },
    });
  }

  for (const row of sourceRows.memberships) {
    statements.push({
      sql: `INSERT INTO memberships (id, user_id, household_id, role, joined_at)
        VALUES (:id, :user_id, :household_id, :role, :joined_at)
        ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, household_id = excluded.household_id,
          role = excluded.role, joined_at = excluded.joined_at`,
      args: {
        id: required(row, 'id', 'memberships'),
        user_id: required(row, 'user_id', 'memberships'),
        household_id: required(row, 'household_id', 'memberships'),
        role: required(row, 'role', 'memberships'),
        joined_at: timestamp(row.joined_at, 'memberships', 'joined_at'),
      },
    });
  }

  for (const row of parentFirst(sourceRows.categories, 'categories')) {
    statements.push({
      sql: `INSERT INTO categories (id, household_id, name, parent_id, icon, color, sort_order)
        VALUES (:id, :household_id, :name, :parent_id, :icon, :color, :sort_order)
        ON CONFLICT(id) DO UPDATE SET household_id = excluded.household_id, name = excluded.name,
          parent_id = excluded.parent_id, icon = excluded.icon, color = excluded.color,
          sort_order = excluded.sort_order`,
      args: {
        id: required(row, 'id', 'categories'),
        household_id: required(row, 'household_id', 'categories'),
        name: required(row, 'name', 'categories'),
        parent_id: row.parent_id,
        icon: row.icon,
        color: row.color,
        sort_order: integer(row.sort_order) ?? 0,
      },
    });
  }

  for (const row of parentFirst(sourceRows.locations, 'locations')) {
    statements.push({
      sql: `INSERT INTO locations (id, household_id, name, parent_id, description, sort_order)
        VALUES (:id, :household_id, :name, :parent_id, :description, :sort_order)
        ON CONFLICT(id) DO UPDATE SET household_id = excluded.household_id, name = excluded.name,
          parent_id = excluded.parent_id, description = excluded.description,
          sort_order = excluded.sort_order`,
      args: {
        id: required(row, 'id', 'locations'),
        household_id: required(row, 'household_id', 'locations'),
        name: required(row, 'name', 'locations'),
        parent_id: row.parent_id,
        description: row.description,
        sort_order: integer(row.sort_order) ?? 0,
      },
    });
  }

  for (const row of parentFirst(sourceRows.storage_spots, 'storage_spots')) {
    const spotType = required(row, 'spot_type', 'storage_spots');
    if (!['room', 'cabinet', 'shelf', 'drawer', 'box', 'other'].includes(spotType)) {
      throw new Error(`Unsupported storage spot type in backup: ${spotType}`);
    }

    const spotId = required(row, 'id', 'storage_spots');
    statements.push({
      sql: `INSERT INTO storage_spots (id, household_id, name, parent_id, spot_type, description,
          capacity, sort_order, qr_token, created_at, updated_at)
        VALUES (:id, :household_id, :name, :parent_id, :spot_type, :description, :capacity,
          :sort_order, :qr_token, :created_at, :updated_at)
        ON CONFLICT(id) DO UPDATE SET household_id = excluded.household_id,
          name = excluded.name, parent_id = excluded.parent_id, spot_type = excluded.spot_type,
          description = excluded.description, capacity = excluded.capacity,
          sort_order = excluded.sort_order, qr_token = excluded.qr_token,
          created_at = excluded.created_at, updated_at = excluded.updated_at`,
      args: {
        id: spotId,
        household_id: required(row, 'household_id', 'storage_spots'),
        name: required(row, 'name', 'storage_spots'),
        parent_id: row.parent_id,
        spot_type: spotType,
        description: row.description,
        capacity: integer(row.capacity) ?? 0,
        sort_order: integer(row.sort_order) ?? 0,
        qr_token: row.qr_token ?? stableToken('storage-spot', spotId),
        created_at: timestamp(row.created_at, 'storage_spots', 'created_at'),
        updated_at: timestamp(row.updated_at, 'storage_spots', 'updated_at'),
      },
    });
  }

  for (const row of sourceRows.items) {
    const itemId = required(row, 'id', 'items');
    const status = required(row, 'status', 'items');
    if (!['stored', 'borrowed', 'lost', 'in_lost_found'].includes(status)) {
      throw new Error(`Unsupported item status in backup: ${status}`);
    }

    statements.push({
      sql: `INSERT INTO items (id, household_id, name, description, category_id, location_id,
          quantity, tags, status, created_by, borrowed_by, borrow_due_date, qr_token, created_at, updated_at, deleted_at)
        VALUES (:id, :household_id, :name, :description, :category_id, :location_id, :quantity,
          :tags, :status, :created_by, :borrowed_by, :borrow_due_date, :qr_token, :created_at, :updated_at, :deleted_at)
        ON CONFLICT(id) DO UPDATE SET household_id = excluded.household_id, name = excluded.name,
          description = excluded.description, category_id = excluded.category_id,
          location_id = excluded.location_id, quantity = excluded.quantity, tags = excluded.tags,
          status = excluded.status, created_by = excluded.created_by, borrowed_by = excluded.borrowed_by,
          borrow_due_date = excluded.borrow_due_date, qr_token = excluded.qr_token, created_at = excluded.created_at,
          updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
      args: {
        id: itemId,
        household_id: required(row, 'household_id', 'items'),
        name: required(row, 'name', 'items'),
        description: row.description,
        category_id: row.category_id,
        location_id: row.location_id,
        quantity: integer(row.quantity) ?? 1,
        tags: JSON.stringify(parsePostgresArray(row.tags)),
        status,
        created_by: required(row, 'created_by', 'items'),
        borrowed_by: row.borrowed_by,
        borrow_due_date: timestamp(row.borrow_due_date, 'items', 'borrow_due_date'),
        qr_token: row.qr_token ?? stableToken('item', itemId),
        created_at: timestamp(row.created_at, 'items', 'created_at'),
        updated_at: timestamp(row.updated_at, 'items', 'updated_at'),
        deleted_at: timestamp(row.deleted_at, 'items', 'deleted_at'),
      },
    });
  }

  for (const row of sourceRows.attachments) {
    const objectKey = required(row, 'drive_file_id', 'attachments');
    const sizeBytes = objectSizes.get(`attachments:${objectKey}`) ?? 0;

    statements.push({
      sql: `INSERT INTO attachments (id, item_id, bucket, object_key, file_name, mime_type,
          size_bytes, thumbnail_key, created_by, created_at)
        VALUES (:id, :item_id, :bucket, :object_key, :file_name, :mime_type, :size_bytes,
          :thumbnail_key, :created_by, :created_at)
        ON CONFLICT(id) DO UPDATE SET item_id = excluded.item_id,
          bucket = CASE WHEN attachments.bucket = 'legacy-supabase' THEN excluded.bucket ELSE attachments.bucket END,
          object_key = CASE WHEN attachments.bucket = 'legacy-supabase' THEN excluded.object_key ELSE attachments.object_key END,
          file_name = excluded.file_name, mime_type = excluded.mime_type,
          size_bytes = CASE WHEN attachments.bucket = 'legacy-supabase' THEN excluded.size_bytes ELSE attachments.size_bytes END,
          thumbnail_key = CASE WHEN attachments.bucket = 'legacy-supabase' THEN excluded.thumbnail_key ELSE attachments.thumbnail_key END,
          created_by = excluded.created_by, created_at = excluded.created_at`,
      args: {
        id: required(row, 'id', 'attachments'),
        item_id: required(row, 'item_id', 'attachments'),
        bucket: 'legacy-supabase',
        object_key: objectKey,
        file_name: required(row, 'file_name', 'attachments'),
        mime_type: required(row, 'mime_type', 'attachments'),
        size_bytes: sizeBytes,
        thumbnail_key: null,
        created_by: required(row, 'created_by', 'attachments'),
        created_at: timestamp(row.created_at, 'attachments', 'created_at'),
      },
    });
  }

  for (const row of sourceRows.item_activities) {
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
        details: jsonObject(row.details),
        created_at: timestamp(row.created_at, 'item_activities', 'created_at'),
      },
    });
  }

  for (const row of sourceRows.borrow_records) {
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

  for (const row of sourceRows.notifications) {
    const notificationType = required(row, 'notification_type', 'notifications');
    if (
      ![
        'return_due_soon',
        'return_overdue',
        'item_returned',
        'item_updated',
        'household_activity',
      ].includes(notificationType)
    ) {
      throw new Error(`Unsupported notification type in backup: ${notificationType}`);
    }

    statements.push({
      sql: `INSERT INTO notifications (id, user_id, household_id, item_id, notification_type,
          title, body, data, read_at, created_at)
        VALUES (:id, :user_id, :household_id, :item_id, :notification_type, :title, :body,
          :data, :read_at, :created_at)
        ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id,
          household_id = excluded.household_id, item_id = excluded.item_id,
          notification_type = excluded.notification_type, title = excluded.title,
          body = excluded.body, data = excluded.data, read_at = excluded.read_at,
          created_at = excluded.created_at`,
      args: {
        id: required(row, 'id', 'notifications'),
        user_id: required(row, 'user_id', 'notifications'),
        household_id: required(row, 'household_id', 'notifications'),
        item_id: row.item_id,
        notification_type: notificationType,
        title: required(row, 'title', 'notifications'),
        body: row.body,
        data: jsonObject(row.data),
        read_at: timestamp(row.read_at, 'notifications', 'read_at'),
        created_at: timestamp(row.created_at, 'notifications', 'created_at'),
      },
    });
  }

  for (const row of sourceRows.notification_preferences) {
    statements.push({
      sql: `INSERT INTO notification_preferences (user_id, due_soon_enabled, overdue_enabled,
          returns_enabled, item_updates_enabled, household_activity_enabled,
          weekly_summary_enabled, pause_all, updated_at)
        VALUES (:user_id, :due_soon_enabled, :overdue_enabled, :returns_enabled,
          :item_updates_enabled, :household_activity_enabled, :weekly_summary_enabled,
          :pause_all, :updated_at)
        ON CONFLICT(user_id) DO UPDATE SET due_soon_enabled = excluded.due_soon_enabled,
          overdue_enabled = excluded.overdue_enabled, returns_enabled = excluded.returns_enabled,
          item_updates_enabled = excluded.item_updates_enabled,
          household_activity_enabled = excluded.household_activity_enabled,
          weekly_summary_enabled = excluded.weekly_summary_enabled, pause_all = excluded.pause_all,
          updated_at = excluded.updated_at`,
      args: {
        user_id: required(row, 'user_id', 'notification_preferences'),
        due_soon_enabled:
          boolean(row.due_soon_enabled, 'notification_preferences', 'due_soon_enabled') ?? 1,
        overdue_enabled:
          boolean(row.overdue_enabled, 'notification_preferences', 'overdue_enabled') ?? 1,
        returns_enabled:
          boolean(row.returns_enabled, 'notification_preferences', 'returns_enabled') ?? 1,
        item_updates_enabled:
          boolean(row.item_updates_enabled, 'notification_preferences', 'item_updates_enabled') ?? 0,
        household_activity_enabled:
          boolean(row.household_activity_enabled, 'notification_preferences', 'household_activity_enabled') ?? 1,
        weekly_summary_enabled:
          boolean(row.weekly_summary_enabled, 'notification_preferences', 'weekly_summary_enabled') ?? 0,
        pause_all: boolean(row.pause_all, 'notification_preferences', 'pause_all') ?? 0,
        updated_at: timestamp(row.updated_at, 'notification_preferences', 'updated_at'),
      },
    });
  }

  const sourceCounts = Object.fromEntries(
    PUBLIC_TABLES.map((table) => [table, sourceRows[table].length]),
  );
  if (process.argv.includes('--dry-run')) {
    console.log(
      JSON.stringify(
        {
          backup: backupPath,
          dryRun: true,
          sourceCounts,
          preparedStatements: statements.length,
          note: 'No database writes were performed. Run without --dry-run to import metadata into Turso.',
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is required');
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  for (let index = 0; index < statements.length; index += 100) {
    await client.batch(statements.slice(index, index + 100), 'write');
  }

  const verification = await client.batch(
    PUBLIC_TABLES.map((table) => ({
      sql: `SELECT count(*) AS count FROM ${table}`,
      args: {},
    })),
    'read',
  );

  const importedCounts = Object.fromEntries(
    PUBLIC_TABLES.map((table, index) => [table, Number(verification[index].rows[0]?.count ?? 0)]),
  );

  console.log(
    JSON.stringify(
      {
        backup: backupPath,
        sourceCounts,
        targetCounts: importedCounts,
        attachmentObjectMetadataMatched: sourceRows.attachments.filter((row) => {
          const objectKey = row.drive_file_id;
          return objectKey ? objectSizes.has(`attachments:${objectKey}`) : false;
        }).length,
        note: 'This script migrates database metadata only; attachment bytes are migrated separately to Cloudflare R2.',
      },
      null,
      2,
    ),
  );
}

await main();
