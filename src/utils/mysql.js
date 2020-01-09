const mysql = require('mysql');

const connectionConfig = {
  connectionLimit: 5,
  connectionTimieout: 30000,
  acquireTimeout: 30000,
  host: process.env.GALAXY_DB_HOST,
  user: process.env.GALAXY_DB_USER,
  password: process.env.GALAXY_DB_PASS,
  database: process.env.GALAXY_DB_NAME
};
const pool = mysql.createPool(connectionConfig);

module.exports.runQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((poolErr, connection) => {
      if (poolErr) {
        console.error('Error with connection: ', poolErr);
        reject(poolErr);
      } else {
        connection.query(query, values, (queryError, result) => {
          if (queryError) {
            connection.release();
            console.error('Error with query: ', query, ' and values: ', values);
            reject(queryError);
          } else {
            connection.release();
            resolve(result);
          }
        });
      }
    });
  });
};

module.exports.TABLE_NAME = {
  EXTERNAL_SYSTEM_ACCOUNT: 'external_system_account'
};
