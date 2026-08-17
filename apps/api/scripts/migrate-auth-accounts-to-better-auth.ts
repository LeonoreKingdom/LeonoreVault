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
      if (lines[index].length > 0) {
        rows.push(lines[index].split('\t').map(decodeCopyValue));
      }
      index += 1;
    }

    blocks.set(`${sourceSchema}.${table}`, {
      columns: columnsText.split(',').map((column) => column.trim()),
      rows,
    });
  }

  return blocks;
}

function rowsFor(blocks: Map<string, CopyBlock>, sourceSchema: string, table: string): SourceRow[] {
  const block = blocks.get(`${sourceSchema}.${table}`);
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

function booleanFlag(value: CopyValue): boolean {
  return value !== null && ['true', 't', '1'].includes(value.toLowerCase());
}

function jsonObject(value: CopyValue, table: string, column: string): Record<string, unknown> | null {
  if (value === null || value === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON value in ${table}.${column}`);
  }
}

function stableId(namespace: string, value: string): string {
  return createHash('sha256').update(`${namespace}:${value}`).digest('hex').slice(0, 32);
}

function externalAccountId(identity: SourceRow): string {
  const data = jsonObject(identity.identity_data, 'auth.identities', 'identity_data');
  const candidates = [
    typeof data?.sub === 'string' ? data.sub : null,
    typeof data?.provider_id === 'string' ? data.provider_id : null,
    identity.provider_id,
  ];
  const accountId = candidates.find((value): value is string => Boolean(value));
  if (!accountId) {
    throw new Error(`Missing external account ID for auth identity ${identity.id ?? '<unknown>'}`);
  }
  return accountId;
}

type SqlArgument = string | number | null;
type SqlStatement = { sql: string; args: Record<string, SqlArgument> };

async function main() {
  const backupPath = getBackupPath();
  const contents = await readFile(backupPath, 'utf8');
  const blocks = parseBackup(contents);
  const authUsers = rowsFor(blocks, 'auth', 'users');
  const identities = rowsFor(blocks, 'auth', 'identities');

  if (authUsers.length === 0) {
    throw new Error('The backup does not contain any auth.users rows');
  }
  const dryRun = process.argv.includes('--dry-run');
  let client: ReturnType<typeof createClient> | null = null;
  const targetUserIds = new Set<string>();
  if (!dryRun) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL is required');
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const targetUsers = await client.execute('SELECT id FROM users');
    for (const row of targetUsers.rows) targetUserIds.add(String(row.id));
  }
  const statements: SqlStatement[] = [];
  const missingProfiles: string[] = [];
  const passwordUsers: string[] = [];
  const accountKeys = new Map<string, string>();
  let skippedDeletedUsers = 0;
  let skippedAnonymousUsers = 0;
  let migratedAccounts = 0;
  let verifiedUsers = 0;

  for (const user of authUsers) {
    const userId = required(user, 'id', 'auth.users');
    if (user.deleted_at || booleanFlag(user.is_anonymous)) {
      if (booleanFlag(user.is_anonymous)) skippedAnonymousUsers += 1;
      else skippedDeletedUsers += 1;
      continue;
    }
    if (!dryRun && !targetUserIds.has(userId)) {
      missingProfiles.push(userId);
      continue;
    }

    const email = user.email;
    const emailVerified = user.email_confirmed_at !== null && user.email_confirmed_at !== '';
    if (emailVerified) verifiedUsers += 1;
    statements.push({
      sql: `UPDATE users
        SET email = COALESCE(:email, email), email_verified = :email_verified
        WHERE id = :id`,
      args: {
        id: userId,
        email,
        email_verified: emailVerified ? 1 : 0,
      },
    });

    if (user.encrypted_password) passwordUsers.push(userId);

    for (const identity of identities.filter((candidate) => candidate.user_id === userId)) {
      const providerId = required(identity, 'provider', 'auth.identities');
      const accountId = externalAccountId(identity);
      const accountKey = `${providerId}:${accountId}`;
      const existingOwner = accountKeys.get(accountKey);
      if (existingOwner && existingOwner !== userId) {
        throw new Error(`Identity ${accountKey} is linked to multiple users in the backup`);
      }
      accountKeys.set(accountKey, userId);

      const createdAt =
        timestamp(identity.created_at, 'auth.identities', 'created_at') ??
        timestamp(user.created_at, 'auth.users', 'created_at') ??
        Date.now();
      const updatedAt =
        timestamp(identity.updated_at, 'auth.identities', 'updated_at') ??
        timestamp(user.updated_at, 'auth.users', 'updated_at') ??
        createdAt;

      statements.push({
        sql: `INSERT INTO accounts (
            id, account_id, provider_id, user_id, access_token, refresh_token,
            access_token_expires_at, refresh_token_expires_at, scope, id_token,
            password, created_at, updated_at
          ) VALUES (
            :id, :account_id, :provider_id, :user_id, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, :created_at, :updated_at
          )
          ON CONFLICT(provider_id, account_id) DO UPDATE SET
            user_id = excluded.user_id,
            updated_at = excluded.updated_at`,
        args: {
          id: stableId('better-auth-account', accountKey),
          account_id: accountId,
          provider_id: providerId,
          user_id: userId,
          created_at: createdAt,
          updated_at: updatedAt,
        },
      });
      migratedAccounts += 1;
    }
  }

  if (!dryRun && missingProfiles.length > 0) {
    throw new Error(
      `Cannot migrate auth users without matching public users profiles: ${missingProfiles.join(', ')}`,
    );
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          backup: backupPath,
          dryRun: true,
          sourceAuthUsers: authUsers.length,
          sourceIdentities: identities.length,
          preparedStatements: statements.length,
          migratedUsers: authUsers.length - skippedDeletedUsers - skippedAnonymousUsers,
          migratedAccounts,
          verifiedUsers,
          skippedDeletedUsers,
          skippedAnonymousUsers,
          passwordAccountsImported: 0,
          passwordUsersRequiringReset: passwordUsers.length,
          note:
            'No database reads or writes were performed. OAuth identities can be imported; Supabase password hashes require a Better Auth password reset.',
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!client) throw new Error('Turso client was not initialized');

  for (let index = 0; index < statements.length; index += 100) {
    await client.batch(statements.slice(index, index + 100), 'write');
  }

  const verification = await client.batch(
    [
      { sql: 'SELECT count(*) AS count FROM accounts', args: {} },
      { sql: 'SELECT count(*) AS count FROM users WHERE email_verified = 1', args: {} },
    ],
    'read',
  );

  console.log(
    JSON.stringify(
      {
        backup: backupPath,
        sourceAuthUsers: authUsers.length,
        sourceIdentities: identities.length,
        migratedUsers: authUsers.length - skippedDeletedUsers - skippedAnonymousUsers,
        migratedAccounts,
        targetAccounts: Number(verification[0].rows[0]?.count ?? 0),
        verifiedUsers,
        targetVerifiedUsers: Number(verification[1].rows[0]?.count ?? 0),
        skippedDeletedUsers,
        skippedAnonymousUsers,
        passwordAccountsImported: 0,
        passwordUsersRequiringReset: passwordUsers.length,
        note:
          passwordUsers.length > 0
            ? 'Supabase password hashes were not copied; Better Auth users must complete a password reset.'
            : 'No Supabase password hashes were present. OAuth identities were migrated without tokens.',
      },
      null,
      2,
    ),
  );
}

await main();
