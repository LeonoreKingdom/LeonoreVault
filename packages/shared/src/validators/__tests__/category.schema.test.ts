import { describe, it, expect } from 'vitest';
import { createCategorySchema, updateCategorySchema } from '../category.schema.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createCategorySchema', () => {
  it('accepts minimal payload (name only)', () => {
    const result = createCategorySchema.parse({ name: 'Electronics' });
    expect(result.name).toBe('Electronics');
    expect(result.sort_order).toBe(0); // default
  });

  it('accepts full payload with all fields', () => {
    const result = createCategorySchema.parse({
      name: 'Books',
      parent_id: VALID_UUID,
      icon: '📚',
      color: '#FF6600',
      sort_order: 5,
    });
    expect(result.color).toBe('#FF6600');
  });

  it('rejects empty name', () => {
    expect(() => createCategorySchema.parse({ name: '' })).toThrow();
  });

  it('rejects invalid hex color', () => {
    expect(() => createCategorySchema.parse({ name: 'Test', color: 'red' })).toThrow();
    expect(() => createCategorySchema.parse({ name: 'Test', color: '#GGG000' })).toThrow();
    expect(() => createCategorySchema.parse({ name: 'Test', color: '#FFF' })).toThrow();
  });

  it('accepts valid hex colors', () => {
    expect(createCategorySchema.parse({ name: 'T', color: '#000000' }).color).toBe('#000000');
    expect(createCategorySchema.parse({ name: 'T', color: '#abcdef' }).color).toBe('#abcdef');
    expect(createCategorySchema.parse({ name: 'T', color: '#ABCDEF' }).color).toBe('#ABCDEF');
  });

  it('allows nullable parent_id', () => {
    const result = createCategorySchema.parse({ name: 'Top', parent_id: null });
    expect(result.parent_id).toBeNull();
  });
});

describe('updateCategorySchema', () => {
  it('accepts empty object', () => {
    expect(updateCategorySchema.parse({})).toEqual({});
  });

  it('accepts partial update', () => {
    const result = updateCategorySchema.parse({ name: 'Renamed', sort_order: 3 });
    expect(result.name).toBe('Renamed');
    expect(result.sort_order).toBe(3);
  });

  it('allows null color and icon', () => {
    const result = updateCategorySchema.parse({ color: null, icon: null });
    expect(result.color).toBeNull();
    expect(result.icon).toBeNull();
  });
});
