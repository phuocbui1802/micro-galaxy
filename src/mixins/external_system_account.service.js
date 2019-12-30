'use strict';
const { runQuery, TABLE_NAME } = require('../utils/mysql.js');

module.exports = {
  /**
   * Methods
   */
  methods: {
    getExternalSystemAccount (systemId, unit = null) {
      const values = [systemId];

      let query = `SELECT * FROM ${TABLE_NAME.EXTERNAL_SYSTEM_ACCOUNT} WHERE external_system_id = ?`;

      if (unit) {
        query += ' AND unit = ?';
        values.push(unit);
      }

      return runQuery(query, values);
    }
  }
};
