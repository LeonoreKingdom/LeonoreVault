import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  updateItemStatusSchema,
  itemListQuerySchema,
} from '../item.schema.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createItemSchema', () => {
  it('accepts minimal valid payload (name only)', () => {
    const result = createItemSchema.parse({ name: 'Test Item' });
    expect(result.name).toBe('Test Item');
    expect(result.quantity).toBe(1); // default
    expect(result.status).toBe('stored'); // default
  });

  it('accepts full payload', () => {
    const result = createItemSchema.parse({
      name: 'Full Item',
      description: 'A description',
      category_id: VALID_UUID,
      location_id: VALID_UUID,
      quantity: 5,
      tags: ['electronics', 'fragile'],
      status: 'borrowed',
    });
    expect(result.tags).toEqual(['electronics', 'fragile']);
    expect(result.status).toBe('borrowed');
  });

  it('rejects empty name', () => {
    expect(() => createItemSchema.parse({ name: '' })).toThrow();
  });

  it('rejects name longer than 200 chars', () => {
    expect(() => createItemSchema.parse({ name: 'x'.repeat(201) })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => createItemSchema.parse({ name: 'Test', status: 'invalid' })).toThrow();
  });

  it('rejects quantity < 1', () => {
    expect(() => createItemSchema.parse({ name: 'Test', quantity: 0 })).toThrow();
  });

  it('rejects non-integer quantity', () => {
    expect(() => createItemSchema.parse({ name: 'Test', quantity: 1.5 })).toThrow();
  });

  it('enforces max tag length (50 chars)', () => {
    expect(() =>
      createItemSchema.parse({ name: 'Test', tags: ['x'.repeat(51)] }),
    ).toThrow();
  });

  it('enforces max 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() => createItemSchema.parse({ name: 'Test', tags })).toThrow();
  });

  it('rejects empty tag strings', () => {
    expect(() => createItemSchema.parse({ name: 'Test', tags: [''] })).toThrow();
  });
});

describe('updateItemSchema', () => {
  it('accepts empty object (no fields to update)', () => {
    expect(updateItemSchema.parse({})).toEqual({});
  });

  it('accepts partial update', () => {
    const result = updateItemSchema.parse({ name: 'Updated', quantity: 3 });
    expect(result.name).toBe('Updated');
    expect(result.quantity).toBe(3);
  });

  it('allows nullable description', () => {
    const result = updateItemSchema.parse({ description: null });
    expect(result.description).toBeNull();
  });

  it('allows nullable category_id and location_id', () => {
    const result = updateItemSchema.parse({ category_id: null, location_id: null });
    expect(result.category_id).toBeNull();
    expect(result.location_id).toBeNull();
  });
});

describe('updateItemStatusSchema', () => {
  it('accepts valid status', () => {
    const result = updateItemStatusSchema.parse({ status: 'borrowed' });
    expect(result.status).toBe('borrowed');
  });

  it('accepts status with borrow fields', () => {
    const result = updateItemStatusSchema.parse({
      status: 'borrowed',
      borrowed_by: VALID_UUID,
      borrow_due_date: '2025-06-01T00:00:00+00:00',
    });
    expect(result.borrowed_by).toBe(VALID_UUID);
  });

  it('rejects invalid status', () => {
    expect(() => updateItemStatusSchema.parse({ status: 'destroyed' })).toThrow();
  });

  it('rejects missing status', () => {
    expect(() => updateItemStatusSchema.parse({})).toThrow();
  });
});

describe('itemListQuerySchema', () => {
  it('applies defaults for empty input', () => {
    const result = itemListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sort).toBe('updated_at');
    expect(result.order).toBe('desc');
  });

  it('coerces string numbers to integers', () => {
    const result = itemListQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page < 1', () => {
    expect(() => itemListQuerySchema.parse({ page: 0 })).toThrow();
  });

  it('rejects limit > 100', () => {
    expect(() => itemListQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it('rejects invalid sort field', () => {
    expect(() => itemListQuerySchema.parse({ sort: 'banana' })).toThrow();
  });

  it('accepts valid filters', () => {
    const result = itemListQuerySchema.parse({
      search: 'laptop',
      status: 'stored',
      category_id: VALID_UUID,
      location_id: VALID_UUID,
    });
    expect(result.search).toBe('laptop');
    expect(result.status).toBe('stored');
  });

  it('transforms comma-separated tags string', () => {
    const result = itemListQuerySchema.parse({ tags: 'electronics, fragile' });
    expect(result.tags).toEqual(['electronics', 'fragile']);
  });
});
