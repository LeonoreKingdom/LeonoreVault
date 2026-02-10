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
  itemListQuerySchema,
  type ItemSchema,
  type CreateItemSchema,
  type UpdateItemSchema,
  type UpdateItemStatusSchema,
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
  googleCallbackSchema,
  refreshTokenSchema,
  type GoogleCallbackSchema,
  type RefreshTokenSchema,
} from './auth.schema.js';
