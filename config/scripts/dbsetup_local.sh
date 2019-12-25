#!/bin/bash

DB_NAME="galaxy"
DB_USER="galaxy"
DB_PASS="galaxy"
DB_ROOT_PASS="root"

SQL_DB_CREATED="SELECT COUNT(1) FROM information_schema.schemata WHERE SCHEMA_NAME = '$DB_NAME';"
SQL_USER_CREATED="SELECT COUNT(1) FROM mysql.user WHERE user = '$DB_USER';"

SQL_CREATE_DB="CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
SQL_CREATE_USER="CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"

echo "Command to create seanote user: " $SQL_CREATE_USER

SQL_GRANT_ACCESS="GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
SQL_DROP_DB="DROP DATABASE $DB_NAME;"
SQL_CLEAR_FOREIGN_KEY_CHECK="SET FOREIGN_KEY_CHECKS = 0;"

#If "galaxy" db is created
EXE_SQL=$(mysql -u root -p$DB_ROOT_PASS -e "$SQL_DB_CREATED")
IS_DB_CREATED=$(echo -n "$EXE_SQL" | tail -c 1)
echo "is galaxy db created?" $IS_DB_CREATED

#if "admin" user is created
EXE_SQL=$(mysql -u root -p$DB_ROOT_PASS -e "$SQL_USER_CREATED")
IS_USER_CREATED=$(echo -n "$EXE_SQL" | tail -c 1)
echo "is admin user created?" $IS_USER_CREATED

#Utility functions
function execute_query_with_root {
    mysql -u root -p$DB_ROOT_PASS -e "$1"
}

function execute_query_with_user {
    mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "$1"
}

#If db is not created
if [ $IS_DB_CREATED -ne 1 ]; then
    echo "galaxy database was not created"
    echo "Creating galaxy database..."
    execute_query_with_root "$SQL_CREATE_DB"

    if [ $IS_USER_CREATED -ne 1 ]; then
        echo "Creating DbUser because IS_USER_CREATED = " $IS_USER_CREATED
        execute_query_with_root "$SQL_CREATE_USER"
    fi

    echo "Granting access for DbUser to galaxy";
    execute_query_with_root "$SQL_GRANT_ACCESS"
else
    echo "Database was created"
    echo "Drop all table"

    if [ $IS_USER_CREATED -ne 1 ]; then
        echo "Creating DbUser because IS_USER_CREATED = " $IS_USER_CREATED
        execute_query_with_root "$SQL_CREATE_USER"
    fi

    echo "Granting access for DbUser to galaxy";
    execute_query_with_root "$SQL_GRANT_ACCESS"

    TABLES=$(mysql -u $DB_USER -p$DB_PASS $DB_NAME -e 'show tables' | awk '{ print $1}' | grep -v '^Tables' )

    for t in $TABLES
    do
        echo "Deleting $t table from $DB_NAME database..."
        execute_query_with_user "$SQL_CLEAR_FOREIGN_KEY_CHECK DROP TABLE \`$t\`;"
    done
fi

#Execute all DDL and DML scripts
DIR_NAME=$(pwd)
SOURCE_PATH_DDL_CONST="$DIR_NAME/config/scripts/ddl/const/*"
SOURCE_PATH_DDL_DATA="$DIR_NAME/config/scripts/ddl/data/*"
SOURCE_PATH_DML_CONST="$DIR_NAME/config/scripts/dml/const/*"
SOURCE_PATH_DML_DATA="$DIR_NAME/config/scripts/dml/data/*"

for f in $SOURCE_PATH_DDL_CONST
do
    if [[ -f $f ]]; then
        echo "Executing script: $f"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < $f
    fi
done
for f in $SOURCE_PATH_DDL_DATA
do
    if [[ -f $f ]]; then
        echo "Executing script: $f"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < $f
    fi
done

for f in $SOURCE_PATH_DML_CONST
do
    if [[ -f $f ]]; then
        echo "Executing script: $f"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < $f
    fi
done
for f in $SOURCE_PATH_DML_DATA
do
    if [[ -f $f ]]; then
        echo "Executing script: $f"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < $f
    fi
done

echo "Database Initialized!"
