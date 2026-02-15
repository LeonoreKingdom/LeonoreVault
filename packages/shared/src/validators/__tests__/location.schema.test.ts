import { describe, it, expect } from 'vitest';
import { createLocationSchema, updateLocationSchema } from '../location.schema.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createLocationSchema', () => {
  it('accepts minimal payload', () => {
    const result = createLocationSchema.parse({ name: 'Kitchen' });
    expect(result.name).toBe('Kitchen');
    expect(result.sort_order).toBe(0);
  });

  it('accepts full payload', () => {
    const result = createLocationSchema.parse({
      name: 'Shelf A',
      parent_id: VALID_UUID,
      description: 'Top shelf in garage',
      sort_order: 2,
    });
    expect(result.parent_id).toBe(VALID_UUID);
    expect(result.description).toBe('Top shelf in garage');
  });

  it('rejects empty name', () => {
    expect(() => createLocationSchema.parse({ name: '' })).toThrow();
  });

  it('rejects name longer than 100 chars', () => {
    expect(() => createLocationSchema.parse({ name: 'x'.repeat(101) })).toThrow();
  });

  it('rejects description longer than 500 chars', () => {
    expect(() =>
      createLocationSchema.parse({ name: 'Test', description: 'x'.repeat(501) }),
    ).toThrow();
  });
});

describe('updateLocationSchema', () => {
  it('accepts empty object', () => {
    expect(updateLocationSchema.parse({})).toEqual({});
  });

  it('accepts partial update', () => {
    const result = updateLocationSchema.parse({ name: 'Renamed Room' });
    expect(result.name).toBe('Renamed Room');
  });

  it('allows nullable description and parent_id', () => {
    const result = updateLocationSchema.parse({ description: null, parent_id: null });
    expect(result.description).toBeNull();
    expect(result.parent_id).toBeNull();
  });
});
