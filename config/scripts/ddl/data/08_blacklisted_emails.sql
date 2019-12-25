DROP TABLE IF EXISTS `blacklisted_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blacklisted_emails` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`email_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`is_domain` tinyint(1) NOT NULL DEFAULT '0',
	`blacklist_import_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`),
	CONSTRAINT `blacklisted_email_ibfk_1` FOREIGN KEY (`blacklist_import_id`) REFERENCES
	`blacklist_imports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
