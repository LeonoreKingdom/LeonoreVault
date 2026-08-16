// ─── Base schemas (reusable in other modules) ──────────────
export { uuidSchema, timestampSchema } from './user.schema.js';

// ─── Entity schemas ─────────────────────────────────────────
export {
  userSchema,
  userProfileSchema,
  updateProfileSchema,
  type UserSchema,
  type UserProfileSchema,
  type UpdateProfileSchema,
} from './user.schema.js';

export {
  householdSchema,
  createHouseholdSchema,
  updateHouseholdSchema,
  membershipSchema,
  joinHouseholdSchema,
  updateMemberRoleSchema,
  type HouseholdSchema,
  type CreateHouseholdSchema,
  type UpdateHouseholdSchema,
  type MembershipSchema,
  type JoinHouseholdSchema,
  type UpdateMemberRoleSchema,
} from './household.schema.js';

export {
  itemSchema,
  createItemSchema,
  updateItemSchema,
  updateItemStatusSchema,
  returnItemSchema,
  itemListQuerySchema,
  type ItemSchema,
  type CreateItemSchema,
  type UpdateItemSchema,
  type UpdateItemStatusSchema,
  type ReturnItemSchema,
  type ItemListQuerySchema,
} from './item.schema.js';

export {
  categorySchema,
  createCategorySchema,
  updateCategorySchema,
  type CategorySchema,
  type CreateCategorySchema,
  type UpdateCategorySchema,
} from './category.schema.js';

export {
  locationSchema,
  createLocationSchema,
  updateLocationSchema,
  type LocationSchema,
  type CreateLocationSchema,
  type UpdateLocationSchema,
} from './location.schema.js';

export {
  storageSpotTypeSchema,
  createStorageSpotSchema,
  updateStorageSpotSchema,
  type CreateStorageSpotSchema,
  type UpdateStorageSpotSchema,
} from './storage-spot.schema.js';

export {
  googleCallbackSchema,
  refreshTokenSchema,
  registerSchema,
  loginSchema,
  type GoogleCallbackSchema,
  type RefreshTokenSchema,
  type RegisterSchema,
  type LoginSchema,
} from './auth.schema.js';

export {
  attachmentSchema,
  linkAttachmentSchema,
  type AttachmentSchema,
  type LinkAttachmentSchema,
} from './attachment.schema.js';

export { qrTokenSchema, qrResolveQuerySchema, type QrResolveQuerySchema } from './qr.schema.js';

export {
  notificationListQuerySchema,
  notificationIdParamSchema,
  notificationPreferenceSchema,
  type NotificationListQuerySchema,
  type NotificationIdParamSchema,
  type NotificationPreferenceSchema,
} from './notification.schema.js';
