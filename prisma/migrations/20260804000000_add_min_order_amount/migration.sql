-- Add minOrderAmount column to SiteConfig
ALTER TABLE `SiteConfig` ADD COLUMN `minOrderAmount` DOUBLE NOT NULL DEFAULT 10;
