PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`active_domain_id` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`active_domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "token_hash", "active_domain_id", "user_agent", "created_at", "last_seen_at", "expires_at") SELECT "id", "token_hash", "active_domain_id", "user_agent", "created_at", "last_seen_at", "expires_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token_hash`);