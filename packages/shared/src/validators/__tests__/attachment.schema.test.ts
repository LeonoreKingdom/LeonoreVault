import { describe, it, expect } from 'vitest';
import { linkAttachmentSchema } from '../attachment.schema.js';

describe('linkAttachmentSchema', () => {
  it('accepts valid URL and fileName', () => {
    const result = linkAttachmentSchema.parse({
      url: 'https://example.com/file.pdf',
      fileName: 'file.pdf',
    });
    expect(result.url).toBe('https://example.com/file.pdf');
    expect(result.fileName).toBe('file.pdf');
  });

  it('accepts optional mimeType', () => {
    const result = linkAttachmentSchema.parse({
      url: 'https://example.com/img.png',
      fileName: 'img.png',
      mimeType: 'image/png',
    });
    expect(result.mimeType).toBe('image/png');
  });

  it('omits mimeType when not provided', () => {
    const result = linkAttachmentSchema.parse({
      url: 'https://example.com/file.pdf',
      fileName: 'file.pdf',
    });
    expect(result.mimeType).toBeUndefined();
  });

  it('rejects invalid URL', () => {
    expect(() =>
      linkAttachmentSchema.parse({ url: 'not-a-url', fileName: 'test.pdf' }),
    ).toThrow();
  });

  it('rejects empty fileName', () => {
    expect(() =>
      linkAttachmentSchema.parse({ url: 'https://example.com', fileName: '' }),
    ).toThrow();
  });

  it('rejects fileName longer than 255 chars', () => {
    expect(() =>
      linkAttachmentSchema.parse({
        url: 'https://example.com',
        fileName: 'x'.repeat(256),
      }),
    ).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => linkAttachmentSchema.parse({})).toThrow();
    expect(() => linkAttachmentSchema.parse({ url: 'https://example.com' })).toThrow();
  });
});
