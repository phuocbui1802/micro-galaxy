ALTER TABLE email DROP FOREIGN KEY `email_ibfk_1`;
RENAME TABLE blacklist_data TO complaint_data;

UPDATE version SET name = '00.00.11';
