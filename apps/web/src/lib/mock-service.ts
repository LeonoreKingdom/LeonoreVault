'use client';

export interface MockAuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface MockMembership {
  id: string;
  userId: string;
  householdId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface MockSession {
  user: MockAuthUser;
  membership: MockMembership | null;
}

export interface MockItem {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  locationId: string | null;
  quantity: number;
  tags: string[];
  status: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
  createdBy: string;
  borrowedBy: string | null;
  borrowDueDate: string | null;
  recentlyReturned?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockAttachment {
  id: string;
  itemId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewLink: string | null;
  createdBy: string;
  createdAt: string;
}

export interface MockHouseholdDetails {
  household: {
    id: string;
    name: string;
    createdBy: string;
    inviteCode: string | null;
    inviteExpiresAt: string | null;
    createdAt: string;
  };
  members: Array<{
    id: string;
    userId: string;
    householdId: string;
    role: 'admin' | 'member' | 'viewer';
    joinedAt: string;
    user: {
      display_name: string | null;
      email: string;
      avatar_url: string | null;
    } | null;
  }>;
  memberCount: number;
}

const MOCK_HOUSEHOLD_ID = 'casa-leonore';
const MOCK_USER_ID = 'mock-user-leonore';
const MOCK_AUTH_KEY = 'leonorevault.mock-auth';
const now = new Date().toISOString();

const mockUser: MockAuthUser = {
  id: MOCK_USER_ID,
  email: 'leonore@example.com',
  displayName: 'Leonore King',
  avatarUrl: null,
};

let mockMembership: MockMembership | null = {
  id: 'mock-membership-owner',
  userId: MOCK_USER_ID,
  householdId: MOCK_HOUSEHOLD_ID,
  role: 'admin',
  joinedAt: now,
};

let mockItems: MockItem[] = [
  {
    id: 'item-cordless-drill',
    householdId: MOCK_HOUSEHOLD_ID,
    name: 'Cordless drill',
    description: '18V drill with charger and two batteries.',
    categoryId: 'tools',
    locationId: 'garage-shelf-a',
    quantity: 1,
    tags: ['tools', 'diy'],
    status: 'stored',
    createdBy: MOCK_USER_ID,
    borrowedBy: null,
    borrowDueDate: null,
    recentlyReturned: 'Returned 2h ago',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: 'item-first-aid-kit',
    householdId: MOCK_HOUSEHOLD_ID,
    name: 'First aid kit',
    description: 'Travel-size household first aid kit.',
    categoryId: 'health',
    locationId: 'hallway-cabinet',
    quantity: 1,
    tags: ['health', 'essentials'],
    status: 'borrowed',
    createdBy: MOCK_USER_ID,
    borrowedBy: 'mock-member-maya',
    borrowDueDate: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: 'item-camping-lantern',
    householdId: MOCK_HOUSEHOLD_ID,
    name: 'Camping lantern',
    description: 'Rechargeable lantern for weekend trips.',
    categoryId: 'outdoor',
    locationId: 'storage-room',
    quantity: 1,
    tags: ['camping', 'outdoor'],
    status: 'stored',
    createdBy: MOCK_USER_ID,
    borrowedBy: null,
    borrowDueDate: null,
    recentlyReturned: 'Returned yesterday',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: 'item-passport-folder',
    householdId: MOCK_HOUSEHOLD_ID,
    name: 'Passport folder',
    description: 'Important travel documents for the household.',
    categoryId: 'documents',
    locationId: 'office-drawer',
    quantity: 1,
    tags: ['travel', 'documents'],
    status: 'stored',
    createdBy: MOCK_USER_ID,
    borrowedBy: null,
    borrowDueDate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
];

const mockHousehold: MockHouseholdDetails = {
  household: {
    id: MOCK_HOUSEHOLD_ID,
    name: 'Casa Leonore',
    createdBy: MOCK_USER_ID,
    inviteCode: 'CASA24',
    inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    createdAt: now,
  },
  members: [
    {
      id: 'mock-membership-owner',
      userId: MOCK_USER_ID,
      householdId: MOCK_HOUSEHOLD_ID,
      role: 'admin',
      joinedAt: now,
      user: {
        display_name: 'Leonore King',
        email: 'leonore@example.com',
        avatar_url: null,
      },
    },
    {
      id: 'mock-membership-maya',
      userId: 'mock-member-maya',
      householdId: MOCK_HOUSEHOLD_ID,
      role: 'member',
      joinedAt: now,
      user: {
        display_name: 'Maya',
        email: 'maya@example.com',
        avatar_url: null,
      },
    },
  ],
  memberCount: 2,
};

const mockAttachments = new Map<string, MockAttachment[]>();

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), 120));
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isMockSignedOut(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(MOCK_AUTH_KEY) === 'signed-out';
}

function saveAuthState(signedIn: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_AUTH_KEY, signedIn ? 'signed-in' : 'signed-out');
}

export async function mockGetSession(): Promise<MockSession | null> {
  return wait(isMockSignedOut() ? null : { user: mockUser, membership: mockMembership });
}

export async function mockSignIn(): Promise<MockSession> {
  saveAuthState(true);
  return wait({ user: mockUser, membership: mockMembership });
}

export async function mockSignInWithEmail(email: string, password: string): Promise<MockSession> {
  if (!email || !password) throw new Error('Email and password are required');
  return mockSignIn();
}

export async function mockSignUp(
  name: string,
  email: string,
  password: string,
): Promise<MockSession> {
  if (!name || !email || !password) throw new Error('Name, email, and password are required');
  return mockSignIn();
}

export async function mockSignOut(): Promise<void> {
  saveAuthState(false);
  await wait(undefined);
}

export async function mockCreateHousehold(name: string): Promise<MockSession> {
  const householdId = createId('household');
  mockMembership = {
    id: createId('membership'),
    userId: MOCK_USER_ID,
    householdId,
    role: 'admin',
    joinedAt: new Date().toISOString(),
  };
  mockHousehold.household = {
    id: householdId,
    name,
    createdBy: MOCK_USER_ID,
    inviteCode: 'NEW456',
    inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  mockHousehold.members = [];
  mockHousehold.memberCount = 0;
  return mockSignIn();
}

export async function mockJoinHousehold(inviteCode: string): Promise<MockSession> {
  if (inviteCode !== 'CASA24' && inviteCode !== 'NEW456') {
    throw new Error('Invite code not found');
  }
  return mockSignIn();
}

function visibleItems(householdId: string): MockItem[] {
  return mockItems.filter((item) => item.householdId === householdId && !item.deletedAt);
}

export async function mockListItems(
  householdId: string,
  params: Record<string, string> = {},
): Promise<{ items: MockItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = Number(params.page ?? 1);
  const limit = Number(params.limit ?? 20);
  const query = params.search?.toLowerCase();
  let result = visibleItems(householdId);

  if (query) {
    result = result.filter((item) =>
      [item.name, item.description ?? '', ...item.tags].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }
  if (params.status) result = result.filter((item) => item.status === params.status);
  if (params.category_id) result = result.filter((item) => item.categoryId === params.category_id);
  if (params.location_id) result = result.filter((item) => item.locationId === params.location_id);

  result.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const total = result.length;
  const start = (page - 1) * limit;

  return wait({
    items: result.slice(start, start + limit),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function mockGetItem(householdId: string, itemId: string): Promise<{ item: MockItem }> {
  const item = visibleItems(householdId).find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('Item not found');
  return wait({ item });
}

export async function mockCreateItem(
  householdId: string,
  payload: Record<string, unknown>,
): Promise<{ item: MockItem }> {
  const timestamp = new Date().toISOString();
  const item: MockItem = {
    id: createId('item'),
    householdId,
    name: String(payload.name ?? 'Untitled item'),
    description: payload.description ? String(payload.description) : null,
    categoryId: payload.category_id ? String(payload.category_id) : null,
    locationId: payload.location_id ? String(payload.location_id) : null,
    quantity: Number(payload.quantity ?? 1),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    status: (payload.status as MockItem['status']) ?? 'stored',
    createdBy: MOCK_USER_ID,
    borrowedBy: null,
    borrowDueDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  mockItems = [item, ...mockItems];
  return wait({ item });
}

export async function mockUpdateItem(
  householdId: string,
  itemId: string,
  payload: Record<string, unknown>,
): Promise<{ item: MockItem }> {
  const index = mockItems.findIndex(
    (candidate) => candidate.id === itemId && candidate.householdId === householdId,
  );
  if (index < 0) throw new Error('Item not found');

  mockItems[index] = {
    ...mockItems[index],
    ...(payload.name ? { name: String(payload.name) } : {}),
    ...(payload.description !== undefined ? { description: String(payload.description) } : {}),
    ...(payload.category_id !== undefined ? { categoryId: String(payload.category_id) } : {}),
    ...(payload.location_id !== undefined ? { locationId: String(payload.location_id) } : {}),
    ...(payload.quantity !== undefined ? { quantity: Number(payload.quantity) } : {}),
    ...(payload.tags !== undefined && Array.isArray(payload.tags)
      ? { tags: payload.tags.map(String) }
      : {}),
    ...(payload.status !== undefined
      ? { status: payload.status as MockItem['status'] }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  return wait({ item: mockItems[index] });
}

export async function mockUpdateItemStatus(
  householdId: string,
  itemId: string,
  payload: Record<string, unknown>,
): Promise<{ item: MockItem }> {
  return mockUpdateItem(householdId, itemId, { status: payload.status });
}

export async function mockDeleteItem(householdId: string, itemId: string): Promise<void> {
  const item = mockItems.find((candidate) => candidate.id === itemId && candidate.householdId === householdId);
  if (!item) throw new Error('Item not found');
  item.deletedAt = new Date().toISOString();
  await wait(undefined);
}

export async function mockGetHousehold(householdId: string): Promise<MockHouseholdDetails> {
  if (mockHousehold.household.id !== householdId) throw new Error('Household not found');
  return wait(mockHousehold);
}

export async function mockGenerateInvite(householdId: string): Promise<void> {
  if (mockHousehold.household.id !== householdId) throw new Error('Household not found');
  mockHousehold.household.inviteCode = 'CASA24';
  mockHousehold.household.inviteExpiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await wait(undefined);
}

export async function mockChangeMemberRole(userId: string, role: string): Promise<void> {
  const member = mockHousehold.members.find((candidate) => candidate.userId === userId);
  if (!member || !['admin', 'member', 'viewer'].includes(role)) throw new Error('Member not found');
  member.role = role as 'admin' | 'member' | 'viewer';
  if (userId === MOCK_USER_ID && mockMembership) mockMembership.role = member.role;
  await wait(undefined);
}

export async function mockRemoveMember(userId: string): Promise<void> {
  mockHousehold.members = mockHousehold.members.filter((member) => member.userId !== userId);
  mockHousehold.memberCount = mockHousehold.members.length;
  if (userId === MOCK_USER_ID) mockMembership = null;
  await wait(undefined);
}

export async function mockListAttachments(itemId: string): Promise<MockAttachment[]> {
  return wait([...(mockAttachments.get(itemId) ?? [])]);
}

export async function mockUploadAttachments(itemId: string, formData: FormData): Promise<MockAttachment[]> {
  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
  const createdAt = new Date().toISOString();
  const attachments = files.map((file) => ({
    id: createId('attachment'),
    itemId,
    driveFileId: `mock/${itemId}/${file.name}`,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    thumbnailUrl: null,
    webViewLink: null,
    createdBy: MOCK_USER_ID,
    createdAt,
  }));
  mockAttachments.set(itemId, [...attachments, ...(mockAttachments.get(itemId) ?? [])]);
  return wait(attachments);
}

export async function mockDeleteAttachment(attachmentId: string): Promise<void> {
  for (const [itemId, attachments] of mockAttachments.entries()) {
    const next = attachments.filter((attachment) => attachment.id !== attachmentId);
    if (next.length !== attachments.length) mockAttachments.set(itemId, next);
  }
  await wait(undefined);
}

export async function mockSync(): Promise<{ applied: Array<{ entityId: string; type: string; status: 'applied' }>; conflicts: never[] }> {
  return wait({ applied: [], conflicts: [] });
}

export async function mockDownload(path: string): Promise<Blob> {
  const label = path.includes('qr-batch') ? 'QR label sheet preview' : 'QR label preview';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><rect x="32" y="32" width="448" height="448" fill="none" stroke="#111827" stroke-width="8"/><text x="256" y="250" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#111827">${label}</text><text x="256" y="286" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#6b7280">LeonoreVault mock</text></svg>`;
  return wait(new Blob([svg], { type: 'image/svg+xml' }));
}

export async function mockRequest<T>(
  method: string,
  path: string,
  options?: { body?: unknown; params?: Record<string, string> },
): Promise<T> {
  const pathname = path.split('?')[0];
  const body = (options?.body ?? {}) as Record<string, unknown>;
  const householdMatch = pathname.match(/^\/api\/households\/([^/]+)/);
  const householdId = householdMatch?.[1] ?? MOCK_HOUSEHOLD_ID;

  const itemMatch = pathname.match(/^\/api\/households\/[^/]+\/items\/([^/]+)/);
  const itemId = itemMatch?.[1];

  if (method === 'GET' && pathname.endsWith('/items')) {
    return (await mockListItems(householdId, options?.params)) as T;
  }
  if (method === 'GET' && itemId && pathname.endsWith(`/items/${itemId}`)) {
    return (await mockGetItem(householdId, itemId)) as T;
  }
  if (method === 'GET' && pathname === `/api/households/${householdId}`) {
    return (await mockGetHousehold(householdId)) as T;
  }
  if (method === 'GET' && itemId && pathname.endsWith('/attachments')) {
    return (await mockListAttachments(itemId)) as T;
  }
  if (method === 'POST' && pathname.endsWith('/items')) {
    return (await mockCreateItem(householdId, body)) as T;
  }
  if (method === 'POST' && pathname === '/api/households') {
    return (await mockCreateHousehold(String(body.name ?? 'New household'))) as T;
  }
  if (method === 'POST' && pathname === '/api/households/join') {
    return (await mockJoinHousehold(String(body.invite_code ?? ''))) as T;
  }
  if (method === 'POST' && pathname.endsWith('/invite')) {
    return (await mockGenerateInvite(householdId)) as T;
  }
  if (method === 'POST' && pathname === '/api/sync') {
    return (await mockSync()) as T;
  }
  if (method === 'PATCH' && itemId && pathname.endsWith('/status')) {
    return (await mockUpdateItemStatus(householdId, itemId, body)) as T;
  }
  if (method === 'PATCH' && itemId && pathname.endsWith(`/items/${itemId}`)) {
    return (await mockUpdateItem(householdId, itemId, body)) as T;
  }
  if (method === 'PATCH' && pathname.includes('/members/')) {
    const userId = pathname.split('/members/')[1];
    return (await mockChangeMemberRole(userId, String(body.role))) as T;
  }
  if (method === 'DELETE' && itemId && pathname.includes('/attachments/')) {
    const attachmentId = pathname.split('/attachments/')[1];
    return (await mockDeleteAttachment(attachmentId)) as T;
  }
  if (method === 'DELETE' && itemId && pathname.endsWith(`/items/${itemId}`)) {
    return (await mockDeleteItem(householdId, itemId)) as T;
  }
  if (method === 'DELETE' && pathname.includes('/members/')) {
    const userId = pathname.split('/members/')[1];
    return (await mockRemoveMember(userId)) as T;
  }

  throw new Error(`Mock service does not support ${method} ${pathname}`);
}
