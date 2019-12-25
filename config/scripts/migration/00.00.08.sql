ALTER TABLE `email` DROP FOREIGN KEY `email_ibfk_2`;

UPDATE version SET name = '00.00.09';
