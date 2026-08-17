import type { inventoryRepositories } from './index.js';

export type InventoryRepositories = typeof inventoryRepositories;

/**
 * Resolve repositories lazily so unit tests and CLI health checks do not open
 * a Turso connection while merely importing an API module.
 */
export async function getInventoryRepositories(): Promise<InventoryRepositories> {
  const { inventoryRepositories: repositories } = await import('./index.js');
  return repositories;
}
