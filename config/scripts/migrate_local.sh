#!/bin/bash

DB_NAME="galaxy"
DB_USER="root"
DB_PASS="root"
DB_HOST="mysql"

#get current version
GET_DATABASE_VERSION="SELECT name FROM version TOP 1"
#

echo "Getting data version"
version=$(mysql -h$DB_HOST -u$DB_USER -p$DB_PASS $DB_NAME -e "SELECT name FROM version")
#trim string to get current version name
version=${version:5}
x="./config/scripts/migration/$version"
echo $version
MIGRATION_PATH="./config/scripts/migration/*"
#get migration file for newer version
for filename in $MIGRATION_PATH
do
	if [[ -f $filename ]]; then
		if [[ "$filename" > "$x" ]] || [ "$filename" == "$x" ]; then
			echo "Running migration file: $filename"
			mysql -h$DB_HOST -u$DB_USER -p$DB_PASS $DB_NAME < $filename
		fi
	fi
done
