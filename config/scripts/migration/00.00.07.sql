DROP TABLE IF EXISTS `blacklist_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blacklist_data` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`email_address` varchar(255) COLLATE utf8mb4_bin NOT NULL,
	`json_data` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

UPDATE version SET name = '00.00.08';
