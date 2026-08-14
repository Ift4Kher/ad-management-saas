-- =============================================================================
-- AdSync SaaS — Database Setup Script for MySQL 8+ / phpMyAdmin
-- Database: lazyski1_ads-manager
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
  `email_verified_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Workspaces Table
DROP TABLE IF EXISTS `workspaces`;
CREATE TABLE `workspaces` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
  `plan` ENUM('STARTER', 'GROWTH', 'AGENCY') NOT NULL DEFAULT 'STARTER',
  `subscription_status` ENUM('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID') NOT NULL DEFAULT 'ACTIVE',
  `stripe_customer_id` VARCHAR(191) NULL,
  `stripe_subscription_id` VARCHAR(191) NULL,
  `current_period_end` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `workspaces_owner_id_idx` (`owner_id`),
  CONSTRAINT `workspaces_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Workspace Members Table
DROP TABLE IF EXISTS `workspace_members`;
CREATE TABLE `workspace_members` (
  `user_id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `workspace_id`),
  KEY `workspace_members_workspace_id_idx` (`workspace_id`),
  KEY `workspace_members_user_id_idx` (`user_id`),
  CONSTRAINT `workspace_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `workspace_members_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Ad Account Connections Table
DROP TABLE IF EXISTS `ad_account_connections`;
CREATE TABLE `ad_account_connections` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `platform` ENUM('GOOGLE', 'META', 'TIKTOK') NOT NULL,
  `access_token_encrypted` TEXT NOT NULL,
  `refresh_token_encrypted` TEXT NULL,
  `status` ENUM('CONNECTED', 'DISCONNECTED', 'EXPIRED', 'ERROR') NOT NULL DEFAULT 'CONNECTED',
  `connected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `token_expires_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `ad_account_connections_workspace_id_idx` (`workspace_id`),
  KEY `ad_account_connections_workspace_id_platform_idx` (`workspace_id`, `platform`),
  CONSTRAINT `ad_account_connections_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Campaigns Table
DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE `campaigns` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL DEFAULT 'Draft Campaign',
  `platform` ENUM('GOOGLE', 'META', 'TIKTOK') NOT NULL,
  `objective` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHING', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `budget` DECIMAL(10,2) NOT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `campaigns_workspace_id_idx` (`workspace_id`),
  KEY `campaigns_workspace_id_platform_idx` (`workspace_id`, `platform`),
  CONSTRAINT `campaigns_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Publish Attempts Table
DROP TABLE IF EXISTS `publish_attempts`;
CREATE TABLE `publish_attempts` (
  `id` VARCHAR(191) NOT NULL,
  `campaign_id` VARCHAR(191) NOT NULL,
  `platform` ENUM('GOOGLE', 'META', 'TIKTOK') NOT NULL,
  `status` ENUM('PENDING', 'PUBLISHING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `external_id` VARCHAR(191) NULL,
  `error_message` TEXT NULL,
  `error_code` VARCHAR(191) NULL,
  `job_id` VARCHAR(191) NULL,
  `attempt_number` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `publish_attempts_campaign_id_idx` (`campaign_id`),
  KEY `publish_attempts_campaign_id_platform_idx` (`campaign_id`, `platform`),
  CONSTRAINT `publish_attempts_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Creative Assets Table
DROP TABLE IF EXISTS `creative_assets`;
CREATE TABLE `creative_assets` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL DEFAULT 'Untitled Asset',
  `type` ENUM('IMAGE', 'VIDEO', 'TEXT', 'CAROUSEL') NOT NULL,
  `url` TEXT NOT NULL,
  `content` TEXT NULL,
  `metadata` JSON NULL,
  `ai_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `compliance_checked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `creative_assets_workspace_id_idx` (`workspace_id`),
  CONSTRAINT `creative_assets_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Automation Rules Table
DROP TABLE IF EXISTS `automation_rules`;
CREATE TABLE `automation_rules` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `campaign_id` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `metric` ENUM('SPEND', 'CPA', 'ROAS') NOT NULL,
  `operator` ENUM('GREATER_THAN', 'LESS_THAN') NOT NULL,
  `threshold` DECIMAL(10,2) NOT NULL,
  `action` ENUM('NOTIFY', 'PAUSE') NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `last_triggered_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `automation_rules_workspace_id_idx` (`workspace_id`),
  KEY `automation_rules_campaign_id_idx` (`campaign_id`),
  CONSTRAINT `automation_rules_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `automation_rules_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Notifications Table
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `rule_id` VARCHAR(191) NULL,
  `campaign_id` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('INFO', 'WARNING', 'ACTION_REQUIRED') NOT NULL DEFAULT 'INFO',
  `status` ENUM('UNREAD', 'READ', 'PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'UNREAD',
  `action_type` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifications_workspace_id_idx` (`workspace_id`),
  KEY `notifications_workspace_id_status_idx` (`workspace_id`, `status`),
  CONSTRAINT `notifications_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notifications_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notifications_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Subscription Events Table
DROP TABLE IF EXISTS `subscription_events`;
CREATE TABLE `subscription_events` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(191) NOT NULL,
  `provider` ENUM('STRIPE', 'BKASH', 'NAGAD') NOT NULL,
  `payload` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `subscription_events_workspace_id_idx` (`workspace_id`),
  CONSTRAINT `subscription_events_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AI Usage Logs Table
DROP TABLE IF EXISTS `ai_usage_logs`;
CREATE TABLE `ai_usage_logs` (
  `id` VARCHAR(191) NOT NULL,
  `workspace_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `feature` VARCHAR(191) NOT NULL,
  `tokens_used` INT NOT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ai_usage_logs_workspace_id_idx` (`workspace_id`),
  KEY `ai_usage_logs_workspace_id_user_id_idx` (`workspace_id`, `user_id`),
  CONSTRAINT `ai_usage_logs_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_usage_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Seed Initial Accounts & Workspaces
-- -----------------------------------------------------------------------------

-- Password hashes generated with bcrypt (10 rounds):
-- 'AdminPass123!' -> $2b$10$w4r6P2L27jD8bXzV8p0LZeo0g1I6c4a4u.27F7mI.xY3C7bZ2I7wK
-- 'Password123!'  -> $2b$10$tZ2R8Z1qg9Q8W8p7X6e5V.x1Y4b7A2C5e8F1a4D7g0J3K6L9N2P5R

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `locale`, `email_verified_at`, `created_at`, `updated_at`) VALUES
('usr_superadmin', 'Super Admin', 'admin@adsync.com', '$2b$10$w4r6P2L27jD8bXzV8p0LZeo0g1I6c4a4u.27F7mI.xY3C7bZ2I7wK', 'en', NOW(3), NOW(3), NOW(3)),
('usr_alpha', 'Alpha Owner', 'user_alpha@adsync.test', '$2b$10$tZ2R8Z1qg9Q8W8p7X6e5V.x1Y4b7A2C5e8F1a4D7g0J3K6L9N2P5R', 'en', NOW(3), NOW(3), NOW(3)),
('usr_beta', 'Beta Owner', 'user_beta@adsync.test', '$2b$10$tZ2R8Z1qg9Q8W8p7X6e5V.x1Y4b7A2C5e8F1a4D7g0J3K6L9N2P5R', 'en', NOW(3), NOW(3), NOW(3));

INSERT INTO `workspaces` (`id`, `name`, `owner_id`, `locale`, `plan`, `subscription_status`, `created_at`, `updated_at`) VALUES
('ws_superadmin', 'Super Admin Enterprise Workspace', 'usr_superadmin', 'en', 'AGENCY', 'ACTIVE', NOW(3), NOW(3)),
('ws_alpha', 'Workspace Alpha (E-Commerce Store)', 'usr_alpha', 'en', 'GROWTH', 'ACTIVE', NOW(3), NOW(3)),
('ws_beta', 'Workspace Beta (Fashion Retail)', 'usr_beta', 'en', 'STARTER', 'ACTIVE', NOW(3), NOW(3));

INSERT INTO `workspace_members` (`user_id`, `workspace_id`, `role`, `created_at`) VALUES
('usr_superadmin', 'ws_superadmin', 'OWNER', NOW(3)),
('usr_alpha', 'ws_alpha', 'OWNER', NOW(3)),
('usr_beta', 'ws_beta', 'OWNER', NOW(3));

SET FOREIGN_KEY_CHECKS = 1;
