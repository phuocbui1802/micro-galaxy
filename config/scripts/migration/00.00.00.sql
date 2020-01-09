ALTER TABLE `file` ADD is_blacklist TINYINT(1) DEFAULT 0;
ALTER TABLE `blacklist_imports` MODIFY COLUMN total_count INT DEFAULT 0;
ALTER TABLE `blacklist_imports` ADD COLUMN `file_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `blacklist_imports` ADD COLUMN `comment` text;
ALTER TABLE `blacklist_imports` ADD CONSTRAINT `blacklist_import_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file` (`id`) ON DELETE CASCADE;
ALTER TABLE `blacklist_imports` DROP FOREIGN KEY `blacklist_import_ibfk_1`;
ALTER TABLE `blacklist_imports` DROP KEY `blacklist_import_ibfk_1`;

ALTER TABLE `email` DROP COLUMN birthday;
ALTER TABLE `email` ADD COLUMN `birthday` DATETIME DEFAULT NULL;

UPDATE version SET name = '00.00.01';
