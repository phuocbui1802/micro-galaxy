ALTER TABLE import ADD COLUMN options TEXT;

UPDATE version SET name = '00.00.04';
