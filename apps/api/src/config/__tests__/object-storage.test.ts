import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = mocks.send;
  },
  PutObjectCommand: class MockPutObjectCommand {
    operation = 'put';
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    operation = 'delete';
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    operation = 'get';
    constructor(public input: unknown) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.signedUrl,
}));

vi.mock('../env.js', () => ({
  env: {
    R2_ACCOUNT_ID: 'account-123',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_BUCKET: 'leonore-vault',
    R2_PUBLIC_URL: 'https://objects.example.com/',
  },
}));

import { objectStorage } from '../object-storage.js';

describe('Cloudflare R2 object storage service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({});
    mocks.signedUrl.mockResolvedValue('https://signed.example/object?signature=test');
  });

  it('reports configuration and builds an encoded public object URL', () => {
    expect(objectStorage.isConfigured).toBe(true);
    expect(objectStorage.publicUrl('household/item/photo one.jpg')).toBe(
      'https://objects.example.com/household/item/photo%20one.jpg',
    );
  });

  it('uploads to the configured R2 bucket with the content type', async () => {
    const result = await objectStorage.put(
      'household/item/photo.jpg',
      Buffer.from('photo'),
      'image/jpeg',
    );

    expect(result).toEqual({
      key: 'household/item/photo.jpg',
      url: 'https://objects.example.com/household/item/photo.jpg',
    });
    expect(mocks.send).toHaveBeenCalledWith({
      operation: 'put',
      input: expect.objectContaining({
        Bucket: 'leonore-vault',
        Key: 'household/item/photo.jpg',
        ContentType: 'image/jpeg',
      }),
    });
  });

  it('rejects unsafe keys before making an R2 request', async () => {
    await expect(objectStorage.put('../escape.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow(
      'Invalid object storage key',
    );
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('deletes an object from the configured bucket', async () => {
    await objectStorage.remove('household/item/photo.jpg');

    expect(mocks.send).toHaveBeenCalledWith({
      operation: 'delete',
      input: expect.objectContaining({
        Bucket: 'leonore-vault',
        Key: 'household/item/photo.jpg',
      }),
    });
  });

  it('creates a short-lived signed URL for private objects', async () => {
    await expect(
      objectStorage.signedUrl('household/item/photo one.jpg', {
        contentType: 'image/jpeg',
        fileName: 'photo one.jpg',
      }),
    ).resolves.toBe('https://signed.example/object?signature=test');

    expect(mocks.signedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        operation: 'get',
        input: expect.objectContaining({
          Bucket: 'leonore-vault',
          Key: 'household/item/photo one.jpg',
          ResponseContentType: 'image/jpeg',
          ResponseContentDisposition: 'inline; filename="photo one.jpg"',
        }),
      }),
      { expiresIn: 300 },
    );
  });
});
