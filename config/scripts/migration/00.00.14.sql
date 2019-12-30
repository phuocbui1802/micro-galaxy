CREATE TABLE mailing_system
(
    `id`           VARCHAR(255) NOT NULL,
    `name`         VARCHAR(255) NOT NULL,
    `account_type` TINYINT               DEFAULT 1,
    `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = INNODB
  DEFAULT CHARSET = UTF8MB4
  COLLATE = UTF8MB4_UNICODE_CI;

CREATE TABLE mailing_system_account
(
    `id`                VARCHAR(255) NOT NULL,
    `name`              VARCHAR(255) NOT NULL,
    `mailing_system_id` VARCHAR(255) NOT NULL,
    `unit`              VARCHAR(255),
    `username`          VARCHAR(255),
    `password`          VARCHAR(255),
    `client_id`         VARCHAR(255),
    `client_secret`     VARCHAR(255),
    `base_url`          VARCHAR(255),
    `token`             TEXT,
    `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `mailing_system_account_system_id` FOREIGN KEY (`mailing_system_id`)
        REFERENCES `mailing_system` (`id`)
        ON DELETE CASCADE
) ENGINE = INNODB
  DEFAULT CHARSET = UTF8MB4
  COLLATE = UTF8MB4_UNICODE_CI;

INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('adspirit','Adspirit',1);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('beyond','Beyond',2);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('cleverpush','CleverPush',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('contasimple','ContaSimple',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('easy','Easy',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('expertfr','ExpertFr',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('greenarrow','GreenArrow',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('kajomi','Kajomi',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('mailckajomi','MailcKajomi',3);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('mailx','Mailx',2);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('sendeep','SenderEP',1);
INSERT INTO `mailing_system` (`id`,`name`,`account_type`) VALUES ('xero','Xero',2);

INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('easy','Easy','easy','U1',NULL,NULL,NULL,NULL,NULL,'UGdTIGuCA0JKIR5u8PKsRfBIoxSujEYcFLgBOFKAEyuKqp6cxfRXfTonLuuICc7g');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('adspirit','Adspirit','adspirit',NULL,'universe','GMxrHQV5yR6A',NULL,NULL,NULL,NULL);
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('beyond_as','beyond AS','beyond','as',NULL,NULL,'apiuser_audienceserv','jXYQysl934txj8ww3E6MpLajLZnL','https://em6.beyondrm.com',NULL);
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('cleverpush','CleverPush','cleverpush',NULL,NULL,NULL,NULL,NULL,NULL,'fQuzSaXNP8ne3JsJjGagLGX2wPQEFmQW');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('greenarrow','GreenArrow','greenarrow',NULL,NULL,NULL,NULL,NULL,NULL,'MTpkNjI4OTBlNjU5MjU4ZGNlZTQ4N2NlN2Q3MTgwMWQ4M2JjZGFiZjdk');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('contasimple','ContaSimple','contasimple',NULL,NULL,NULL,NULL,NULL,NULL,'2b48b931460943c1b3013c5753011f38');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('beyond_karma','beyond karma','beyond','karma',NULL,NULL,'apiuser_karma','lnCrDueC-b5gilJ8MhHv1Ez5waUx','https://em6.beyondrm.com',NULL);
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('beyond_default','beyond default','beyond','default',NULL,NULL,'evania_apiusr','XAkJeib^LBuCgBqvV-ZeYr^jqoJa','https://em6.beyondrm.com',NULL);
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('easy2','Easy','easy','U2',NULL,NULL,NULL,NULL,NULL,'fMQHI4q73DQMZmLcglZbviDGCf8racPnz4u0kcDVTqeTqmCxGep5wdMm74vDy7PL');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('expertfr','ExpertFr','expertfr',NULL,NULL,NULL,NULL,NULL,NULL,'CJ6J1iLeKcaaAYzNOrj4');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('kajomi','Kajomi','kajomi','as',NULL,NULL,NULL,NULL,NULL,'dd724a95e80146d7a3fb19ac2a05aefd/bmV3X2V2YW5pYW1lZGlh');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('kajomi2','Kajomi','kajomi','mc',NULL,NULL,NULL,NULL,NULL,'d2d515b0f09647fbbb7a8d73ae6a2e15/bmV3X2dldHBlcmZvcm1hbmNl');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('mailckajomi','MailcKajomi','mailckajomi',NULL,NULL,NULL,NULL,NULL,NULL,'d2d515b0f09647fbbb7a8d73ae6a2e15/bmV3X2dldHBlcmZvcm1hbmNl');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('mailx','Mailx','mailx',NULL,NULL,NULL,'e979229416e16e4ad771ab7bba9f48e9e4d01ce13de3633d0aa15ff46305bf39',NULL,NULL,'c410dc45876421845edcad155722063d32c5ce03');
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('sendeep','SenderEP','sendeep',NULL,'EPNewsdestages','12285a7181d64a8c5d5e4f34b8cc0eb0d70c2903',NULL,NULL,NULL,NULL);
INSERT INTO `external_system_account` (`id`,`name`,`external_system_id`,`unit`,`username`,`password`,`client_id`,`client_secret`,`base_url`,`token`) VALUES ('xero','Xero','xero',NULL,NULL,NULL,'ZPNWK2PMZWO3WYNXZO0J6HKXXDQMGJ','UUZSFCW96WWLVVBHA5K3FJ8YO5K4HD',NULL,NULL);

UPDATE version
SET name = '00.00.15';
