CREATE TABLE `qr_logins` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`status` text NOT NULL,
	`session_id` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `qr_logins_code_idx` ON `qr_logins` (`code_hash`);