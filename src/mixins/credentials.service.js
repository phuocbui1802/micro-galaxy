'use strict';

const axios = require('axios');

const CRE_ENDPOINTS = {
  SINGLE_KEY: '/credentials/:name:'
};

module.exports = {
  /**
   * Methods
   */
  methods: {
    async getConfigByName (name) {
      let url = `${process.env.CREDENTIAL_HOST}${CRE_ENDPOINTS.SINGLE_KEY}`.replace(':name:', name);

      const res = await axios({
        method: 'GET',
        url: url,
        headers: {
          'x-api-key': process.env.CREDIENTIAL_API_KEY
        }
      });

      return res.data.response[0];
    }
  }
};
