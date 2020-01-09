DROP TABLE IF EXISTS `import`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `import` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`total_count` int DEFAULT 0,
	`new_count` int DEFAULT 0,
	`invalid_count` int DEFAULT 0,
	`duplicate_count` int DEFAULT 0,
	`failed_count` int DEFAULT 0,
	`blacklist_count` int DEFAULT 0,
	`options` TEXT,
	`importer_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`supplier_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`file_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`import_status_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`),
  CONSTRAINT `import_ibfk_1` FOREIGN KEY (`import_status_id`) REFERENCES `import_status` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_ibfk_3` FOREIGN KEY (`file_id`) REFERENCES `file` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
