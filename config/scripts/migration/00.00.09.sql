ALTER TABLE email ADD COLUMN `widerspruch` varchar(20) default NULL;

UPDATE version SET name = '00.00.10';
