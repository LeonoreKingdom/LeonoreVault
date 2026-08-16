CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`bucket` text DEFAULT 'leonorevault' NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`thumbnail_key` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "attachments_file_name_length" CHECK(length("attachments"."file_name") between 1 and 255),
	CONSTRAINT "attachments_size_non_negative" CHECK("attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_item` ON `attachments` (`item_id`);--> statement-breakpoint
CREATE TABLE `borrow_records` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`household_id` text NOT NULL,
	`borrowed_by` text NOT NULL,
	`borrowed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`returned_at` integer,
	`due_at` integer,
	`note` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`borrowed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_borrow_records_item_time` ON `borrow_records` (`item_id`,`borrowed_at`);--> statement-breakpoint
CREATE INDEX `idx_borrow_records_household_active` ON `borrow_records` (`household_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `idx_borrow_records_borrower` ON `borrow_records` (`borrowed_by`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`icon` text,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "categories_name_length" CHECK(length("categories"."name") between 1 and 100),
	CONSTRAINT "categories_no_self_parent" CHECK("categories"."id" <> "categories"."parent_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_household_parent_name_unique` ON `categories` (`household_id`,`parent_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_categories_household` ON `categories` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`invite_code` text,
	`invite_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "households_name_length" CHECK(length("households"."name") between 1 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_invite_code_unique` ON `households` (`invite_code`);--> statement-breakpoint
CREATE INDEX `idx_households_created_by` ON `households` (`created_by`);--> statement-breakpoint
CREATE TABLE `item_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_activities_item_time` ON `item_activities` (`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activities_user` ON `item_activities` (`user_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category_id` text,
	`location_id` text,
	`storage_spot_id` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'stored' NOT NULL,
	`created_by` text NOT NULL,
	`borrowed_by` text,
	`borrow_due_date` integer,
	`qr_token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`storage_spot_id`) REFERENCES `storage_spots`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`borrowed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "items_name_length" CHECK(length("items"."name") between 1 and 200),
	CONSTRAINT "items_quantity_positive" CHECK("items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_qr_token_unique` ON `items` (`qr_token`);--> statement-breakpoint
CREATE INDEX `idx_items_household` ON `items` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_items_household_status` ON `items` (`household_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_items_storage_spot` ON `items` (`household_id`,`storage_spot_id`);--> statement-breakpoint
CREATE INDEX `idx_items_created_by` ON `items` (`created_by`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "locations_name_length" CHECK(length("locations"."name") between 1 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_household_parent_name_unique` ON `locations` (`household_id`,`parent_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_locations_household` ON `locations` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_parent` ON `locations` (`parent_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_household_unique` ON `memberships` (`user_id`,`household_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_household` ON `memberships` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`due_soon_enabled` integer DEFAULT true NOT NULL,
	`overdue_enabled` integer DEFAULT true NOT NULL,
	`returns_enabled` integer DEFAULT true NOT NULL,
	`item_updates_enabled` integer DEFAULT false NOT NULL,
	`household_activity_enabled` integer DEFAULT true NOT NULL,
	`weekly_summary_enabled` integer DEFAULT false NOT NULL,
	`pause_all` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`item_id` text,
	`notification_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`data` text DEFAULT '{}' NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created_at` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_household` ON `notifications` (`household_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `storage_spots` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`spot_type` text DEFAULT 'other' NOT NULL,
	`description` text,
	`capacity` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`qr_token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `storage_spots`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "storage_spots_name_length" CHECK(length("storage_spots"."name") between 1 and 100),
	CONSTRAINT "storage_spots_capacity_non_negative" CHECK("storage_spots"."capacity" >= 0),
	CONSTRAINT "storage_spots_no_self_parent" CHECK("storage_spots"."id" <> "storage_spots"."parent_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `storage_spots_household_parent_name_unique` ON `storage_spots` (`household_id`,`parent_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `storage_spots_qr_token_unique` ON `storage_spots` (`qr_token`);--> statement-breakpoint
CREATE INDEX `idx_storage_spots_household` ON `storage_spots` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_storage_spots_parent` ON `storage_spots` (`parent_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);