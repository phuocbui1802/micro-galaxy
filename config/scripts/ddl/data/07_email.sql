DROP TABLE IF EXISTS `email`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email` (
	`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`email_address` varchar(255) COLLATE utf8mb4_bin NOT NULL,
	`email_md5` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`email_domain` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`supplier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`birthday` datetime default null,
	`ip` varchar(100) DEFAULT NULL,
	`valid` TINYINT(1) DEFAULT TRUE,
	`city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`zip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`city_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`country_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`fallback_country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`zip_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`import_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
	`blacklist_import_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`system_bounce` tinyint(1) DEFAULT 0,
	`subscribed` tinyint(1) NOT NULL DEFAULT '1',
	`widerspruch` varchar(20) default null,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`is_enabled` tinyint(1) NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`),
	INDEX (`email_address`),
  UNIQUE KEY `email_unique` (`email_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
