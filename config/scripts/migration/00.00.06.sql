ALTER TABLE email ADD COLUMN `subscribed` tinyint(1) NOT NULL DEFAULT '1';

UPDATE version SET name = '00.00.07';
