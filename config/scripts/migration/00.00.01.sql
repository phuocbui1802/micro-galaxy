ALTER TABLE `email_import` DROP COLUMN id;

UPDATE version SET name = '00.00.02';
