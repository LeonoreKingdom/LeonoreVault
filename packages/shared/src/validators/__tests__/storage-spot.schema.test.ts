import { describe, expect, it } from 'vitest';
import { createStorageSpotSchema, updateStorageSpotSchema } from '../storage-spot.schema.js';

const parentId = '550e8400-e29b-41d4-a716-446655440000';

describe('createStorageSpotSchema', () => {
  it('applies defaults for a minimal spot', () => {
    expect(createStorageSpotSchema.parse({ name: 'Kitchen' })).toEqual({
      name: 'Kitchen',
      spot_type: 'other',
      capacity: 0,
      sort_order: 0,
    });
  });

  it('accepts hierarchy and capacity fields', () => {
    expect(
      createStorageSpotSchema.parse({
        name: 'Pantry shelf',
        parent_id: parentId,
        spot_type: 'shelf',
        description: 'Dry goods shelf',
        capacity: 12,
        sort_order: 2,
      }),
    ).toMatchObject({ parent_id: parentId, spot_type: 'shelf', capacity: 12, sort_order: 2 });
  });

  it('rejects invalid type and negative capacity', () => {
    expect(() => createStorageSpotSchema.parse({ name: 'Shelf', spot_type: 'rack' })).toThrow();
    expect(() => createStorageSpotSchema.parse({ name: 'Shelf', capacity: -1 })).toThrow();
  });

  it('rejects invalid names and parent ids', () => {
    expect(() => createStorageSpotSchema.parse({ name: '' })).toThrow();
    expect(() =>
      createStorageSpotSchema.parse({ name: 'Shelf', parent_id: 'not-a-uuid' }),
    ).toThrow();
  });
});

describe('updateStorageSpotSchema', () => {
  it('allows partial updates', () => {
    expect(updateStorageSpotSchema.parse({ name: 'Renamed shelf', capacity: 8 })).toEqual({
      name: 'Renamed shelf',
      capacity: 8,
    });
  });

  it('allows moving a spot to a root', () => {
    expect(updateStorageSpotSchema.parse({ parent_id: null })).toEqual({ parent_id: null });
  });

  it('rejects invalid capacity and sort order', () => {
    expect(() => updateStorageSpotSchema.parse({ capacity: 1.5 })).toThrow();
    expect(() => updateStorageSpotSchema.parse({ sort_order: -1 })).toThrow();
  });

  it('rejects descriptions over the database limit', () => {
    expect(() => updateStorageSpotSchema.parse({ description: 'x'.repeat(501) })).toThrow();
  });
});
