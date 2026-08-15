CREATE TABLE `aiInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('connection','extraction','superposition') NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiInsights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`category` enum('skill','interest','project','idea') NOT NULL DEFAULT 'idea',
	`confidence` int NOT NULL DEFAULT 70,
	`tags` text NOT NULL,
	`urls` text NOT NULL,
	`positionX` int NOT NULL DEFAULT 0,
	`positionY` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concepts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entanglements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceId` int NOT NULL,
	`targetId` int NOT NULL,
	`relationship` varchar(120) NOT NULL DEFAULT 'relates to',
	`strength` int NOT NULL DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entanglements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ai_insights_user_kind_idx` ON `aiInsights` (`userId`,`kind`);--> statement-breakpoint
CREATE INDEX `concepts_user_updated_idx` ON `concepts` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `entanglements_user_idx` ON `entanglements` (`userId`);--> statement-breakpoint
CREATE INDEX `entanglements_source_idx` ON `entanglements` (`sourceId`);--> statement-breakpoint
CREATE INDEX `entanglements_target_idx` ON `entanglements` (`targetId`);
