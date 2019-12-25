DROP TABLE IF EXISTS `auth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`),
	CONSTRAINT `auth_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
	ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
