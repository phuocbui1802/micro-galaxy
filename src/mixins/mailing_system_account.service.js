'use strict';
const { runQuery, TABLE_NAME } = require('../utils/mysql.js');

module.exports = {
  /**
   * Methods
   */
  methods: {
    getMailingSystemAccount (mailingSystemId, unit = null) {
      const values = [mailingSystemId];

      let query = `SELECT * FROM ${TABLE_NAME.MAILING_SYSTEM_ACCOUNT} WHERE mailing_system_id = ?`;

      if (unit) {
        query += ' AND unit = ?';
        values.push(unit);
      }

      return runQuery(query, values);
    }
  }
};
