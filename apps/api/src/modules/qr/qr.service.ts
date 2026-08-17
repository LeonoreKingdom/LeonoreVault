import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { objectStorage } from '../../config/object-storage.js';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

function mapResolvedItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    qrToken: row.qrToken,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.categoryId ?? null,
    locationId: row.locationId ?? null,
    storageSpotId: row.storageSpotId ?? null,
    quantity: row.quantity,
    tags: row.tags ?? [],
    status: row.status,
    borrowedBy: row.borrowedBy ?? null,
    borrowDueDate: row.borrowDueDate ?? null,
    updatedAt: row.updatedAt,
  };
}

function mapResolvedSpot(row: Record<string, unknown>) {
  return {
    id: row.id,
    qrToken: row.qrToken,
    name: row.name,
    parentId: row.parentId ?? null,
    spotType: row.spotType,
    description: row.description ?? null,
    capacity: row.capacity,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  };
}

/** Resolve an opaque QR token to a household-scoped item or storage spot. */
export async function resolveQrToken(householdId: string, token: string) {
  const repositories = await getInventoryRepositories();
  const [item, spot] = await Promise.all([
    repositories.items.findActiveByQrToken(token, householdId),
    repositories.storageSpots.findByQrToken(token, householdId),
  ]);
  if (item && spot) {
    throw new AppError(409, 'QR token matches more than one resource', 'QR_TOKEN_AMBIGUOUS');
  }
  if (item) return { type: 'item' as const, item: mapResolvedItem(item) };
  if (spot) return { type: 'spot' as const, storageSpot: mapResolvedSpot(spot) };

  throw new AppError(404, 'QR token not found', 'QR_NOT_FOUND');
}

// ─── Config ─────────────────────────────────────────────────

const APP_BASE_URL = 'https://leonorevault.com/app';
const QR_LABEL_PREFIX = 'qr-labels';

function scanUrl(itemId: string): string {
  return `${APP_BASE_URL}/scan?item=${itemId}`;
}

async function storeQrLabel(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  if (!objectStorage.isConfigured) {
    throw new AppError(503, 'Cloudflare R2 storage is not configured', 'STORAGE_NOT_CONFIGURED');
  }

  try {
    await objectStorage.put(key, data, contentType);
  } catch (err) {
    logger.error({ err, key }, 'Failed to store QR label in R2');
    throw new AppError(502, 'Failed to store QR label', 'QR_LABEL_STORAGE_FAILED');
  }
}

async function assertItemInHousehold(itemId: string, householdId: string): Promise<void> {
  const repositories = await getInventoryRepositories();
  const item = await repositories.items.findById(itemId, householdId);
  if (!item || item.deletedAt) throw new AppError(404, 'Item not found', 'NOT_FOUND');
}

// ─── Single QR Code ─────────────────────────────────────────

/**
 * Generate a QR code as PNG buffer or SVG string.
 */
export async function generateQrCode(
  householdId: string,
  itemId: string,
  format: 'png' | 'svg' = 'png',
  size: number = 256,
): Promise<{ data: Buffer | string; contentType: string }> {
  await assertItemInHousehold(itemId, householdId);
  const url = scanUrl(itemId);

  if (format === 'svg') {
    const svg = await QRCode.toString(url, { type: 'svg', width: size, margin: 1 });
    await storeQrLabel(
      `${QR_LABEL_PREFIX}/${householdId}/items/${itemId}/qr-${size}.svg`,
      Buffer.from(svg, 'utf8'),
      'image/svg+xml',
    );
    return { data: svg, contentType: 'image/svg+xml' };
  }

  const buffer = await QRCode.toBuffer(url, { type: 'png', width: size, margin: 1 });
  await storeQrLabel(
    `${QR_LABEL_PREFIX}/${householdId}/items/${itemId}/qr-${size}.png`,
    buffer,
    'image/png',
  );
  return { data: buffer, contentType: 'image/png' };
}

// ─── Batch PDF ──────────────────────────────────────────────

interface ItemInfo {
  id: string;
  name: string;
}

interface LayoutConfig {
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  qrSize: number;
  fontSize: number;
  showId: boolean;
}

const LAYOUTS: Record<string, LayoutConfig> = {
  'grid-8': {
    cols: 2,
    rows: 4,
    labelW: 90,
    labelH: 62,
    qrSize: 40,
    fontSize: 9,
    showId: true,
  },
  'grid-24': {
    cols: 4,
    rows: 6,
    labelW: 45,
    labelH: 38,
    qrSize: 25,
    fontSize: 6,
    showId: false,
  },
};

/**
 * Generate an A4 PDF with QR code labels for multiple items.
 */
export async function generateBatchPdf(
  householdId: string,
  itemIds: string[],
  layout: string = 'grid-8',
): Promise<Buffer> {
  // Fetch item names
  const repositories = await getInventoryRepositories();
  const items = await repositories.items.listByIds(itemIds, householdId);
  if (items.length === 0) {
    throw new Error('Items not found');
  }

  const itemMap = new Map(items.map((i: ItemInfo) => [i.id, i.name]));
  const selectedLayout = layout in LAYOUTS ? layout : 'grid-8';
  const config: LayoutConfig = LAYOUTS[selectedLayout]!;

  // A4 page dimensions in mm
  const pageW = 210;
  const pageH = 297;
  const marginX = (pageW - config.cols * config.labelW) / 2;
  const marginY = (pageH - config.rows * config.labelH) / 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const labelsPerPage = config.cols * config.rows;

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]!;
    const name = itemMap.get(itemId) || 'Unknown';

    // New page if needed (skip first)
    if (i > 0 && i % labelsPerPage === 0) {
      doc.addPage();
    }

    const indexOnPage = i % labelsPerPage;
    const col = indexOnPage % config.cols;
    const row = Math.floor(indexOnPage / config.cols);

    const x = marginX + col * config.labelW;
    const y = marginY + row * config.labelH;

    // Generate QR as base64 PNG
    const qrDataUrl = await QRCode.toDataURL(scanUrl(itemId), {
      width: config.qrSize * 4, // Higher res for print
      margin: 1,
    });

    // Center QR horizontally in label
    const qrX = x + (config.labelW - config.qrSize) / 2;
    const qrY = y + 3;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, config.qrSize, config.qrSize);

    // Item name (truncated)
    const textY = qrY + config.qrSize + 3;
    doc.setFontSize(config.fontSize);
    const maxChars = config.showId ? 20 : 12;
    const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    doc.text(displayName, x + config.labelW / 2, textY, { align: 'center' });

    // Short ID
    if (config.showId) {
      doc.setFontSize(config.fontSize - 2);
      doc.setTextColor(128, 128, 128);
      doc.text(itemId.slice(0, 8), x + config.labelW / 2, textY + 4, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Label border (light gray)
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, config.labelW, config.labelH);
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  const pdf = Buffer.from(arrayBuffer);
  await storeQrLabel(
    `${QR_LABEL_PREFIX}/${householdId}/batches/${randomUUID()}-${selectedLayout}.pdf`,
    pdf,
    'application/pdf',
  );
  return pdf;
}
