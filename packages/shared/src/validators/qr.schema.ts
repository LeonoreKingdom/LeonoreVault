import { z } from 'zod';

/** Opaque 128-bit token embedded in item and storage-spot QR labels. */
export const qrTokenSchema = z.string().regex(/^[0-9a-f]{32}$/, 'Invalid QR token');

/** Query parameters for resolving a scanned QR token. */
export const qrResolveQuerySchema = z.object({
  token: qrTokenSchema,
});

export type QrResolveQuerySchema = z.infer<typeof qrResolveQuerySchema>;
