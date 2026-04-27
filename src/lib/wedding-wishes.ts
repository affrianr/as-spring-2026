import type { D1Database } from '@cloudflare/workers-types';

export interface WeddingWish {
  id: string;
  name: string;
  message: string;
  createdAt: number;
}

export interface WeddingWishInput {
  name: string;
  message: string;
}

interface WeddingWishRow {
  id: string;
  name: string;
  message: string;
  createdAt: number | string;
}

const initializedDbs = new WeakSet<D1Database>();
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 500;
const CREATE_WEDDING_WISHES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS wedding_wishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`;
const CREATE_WEDDING_WISHES_INDEX_SQL =
  'CREATE INDEX IF NOT EXISTS idx_wedding_wishes_created_at ON wedding_wishes(created_at DESC)';

const normalizeName = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
    : '';

const normalizeMessage = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().replace(/\r\n/g, '\n').slice(0, MAX_MESSAGE_LENGTH)
    : '';

const toTimestamp = (value: number | string) => {
  if (typeof value === 'number') return value;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const normalizeLimit = (value: number) =>
  Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(value) ? value : DEFAULT_LIMIT));

const ensureWeddingWishesTable = async (db: D1Database) => {
  if (initializedDbs.has(db)) return;

  await db.prepare(CREATE_WEDDING_WISHES_TABLE_SQL).run();
  await db.prepare(CREATE_WEDDING_WISHES_INDEX_SQL).run();
  initializedDbs.add(db);
};

export const validateWeddingWish = (payload: {
  name: unknown;
  message: unknown;
}) => {
  const name = normalizeName(payload.name);
  const message = normalizeMessage(payload.message);

  if (!name) {
    return { error: 'Please enter your name.' } as const;
  }

  if (!message) {
    return { error: 'Please write a short message.' } as const;
  }

  return {
    data: {
      name,
      message,
    },
  } as const;
};

export const listWeddingWishes = async (
  db: D1Database | undefined,
  limit = DEFAULT_LIMIT,
) => {
  if (!db) return [] as WeddingWish[];
  await ensureWeddingWishesTable(db);

  const { results } = await db
    .prepare(
      `SELECT id, name, message, created_at AS createdAt
       FROM wedding_wishes
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(normalizeLimit(limit))
    .all<WeddingWishRow>();

  return results.map((wish) => ({
    id: wish.id,
    name: wish.name,
    message: wish.message,
    createdAt: toTimestamp(wish.createdAt),
  }));
};

export const createWeddingWish = async (
  db: D1Database,
  input: WeddingWishInput,
) => {
  await ensureWeddingWishesTable(db);

  const wish: WeddingWish = {
    id: crypto.randomUUID(),
    name: input.name,
    message: input.message,
    createdAt: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO wedding_wishes (id, name, message, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(wish.id, wish.name, wish.message, wish.createdAt)
    .run();

  return wish;
};
