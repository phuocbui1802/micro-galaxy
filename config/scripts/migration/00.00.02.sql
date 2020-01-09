ALTER TABLE blacklisted_emails ADD COLUMN is_domain tinyint(1) NOT NULL DEFAULT '0';
ALTER TABLE import ADD COLUMN blacklist_count int DEFAULT 0;

UPDATE version SET name = '00.00.03';
