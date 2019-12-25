ALTER TABLE `process` ADD COLUMN `mailing_system` varchar(255) COLLATE utf8mb4_bin;

UPDATE version SET name = '00.00.14';
