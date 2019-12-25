DROP TABLE IF EXISTS `blacklist_imports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blacklist_imports` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`total_count` int DEFAULT 0,
	`importer_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`file_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`comment` TEXT,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`),
  CONSTRAINT `blacklist_import_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
