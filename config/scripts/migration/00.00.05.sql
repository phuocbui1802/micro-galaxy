ALTER TABLE email ADD COLUMN `supplier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

UPDATE version SET name = '00.00.06';
