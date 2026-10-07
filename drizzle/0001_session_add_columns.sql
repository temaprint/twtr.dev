CREATE TABLE `session_domains` (
	`session_id` text NOT NULL,
	`domain_id` text NOT NULL,
	`identity_id` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `domain_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_domains_domain_idx` ON `session_domains` (`domain_id`);--> statement-breakpoint
CREATE TABLE `session_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_transfers_code_idx` ON `session_transfers` (`code_hash`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `active_domain_id` text REFERENCES domains(id);--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_seen_at` integer;--> statement-breakpoint
-- Backfill: every pre-multi-session session keeps its domain as the first binding.
INSERT INTO `session_domains` (`session_id`, `domain_id`, `identity_id`, `added_at`)
SELECT `id`, `domain_id`, `identity_id`, `created_at` FROM `sessions`;--> statement-breakpoint
UPDATE `sessions` SET `active_domain_id` = `domain_id`, `last_seen_at` = `created_at`;