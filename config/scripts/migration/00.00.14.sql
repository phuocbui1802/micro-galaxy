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
    `login_url`         VARCHAR(255),
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

INSERT INTO mailing_system(id, name, account_type)
VALUES ('beyond', 'Beyond', 2);
INSERT INTO mailing_system_account(id, name, mailing_system_id, unit, client_id, client_secret, login_url)
VALUES ('beyond_default', 'beyond default', 'beyond', 'default', 'evania_apiusr', 'XAkJeib^LBuCgBqvV-ZeYr^jqoJa',
        'https://em6.beyondrm.com'),
       ('beyond_karma', 'beyond karma', 'beyond', 'karma', 'apiuser_karma', 'lnCrDueC-b5gilJ8MhHv1Ez5waUx',
        'https://em6.beyondrm.com'),
       ('beyond_as', 'beyond AS', 'beyond', 'as', 'apiuser_audienceserv', 'jXYQysl934txj8ww3E6MpLajLZnL',
        'https://em6.beyondrm.com');

UPDATE version
SET name = '00.00.15';
