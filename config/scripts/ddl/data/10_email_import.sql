DROP TABLE IF EXISTS `email_import`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_import` (
	`email_address` varchar(255) COLLATE utf8mb4_bin NOT NULL,
	`import_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	INDEX (`email_address`),
	INDEX (`import_id`),
	CONSTRAINT `email_import_ibfk1` FOREIGN KEY (`import_id`) REFERENCES `import` (`id`)
	ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
