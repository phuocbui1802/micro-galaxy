'use strict';

const axios = require('axios');

const ENDPOINTS = {
  GET_SINGLE_SENDOUT: '/api/doctorsender/{account}/{campaignId}'
};

module.exports = {
  name: 'gateway_doctorsender',

  /**
  * Service settings
  */
  settings: {

  },

  /**
  * Service dependencies
  */
  dependencies: [],

  /**
  * Actions
  */
  actions: {
    handleGetSendout (ctx) {
      return this.getSingleSendout(ctx.params.id, ctx.params.unit);
    }
  },

  /**
  * Events
  */
  events: {

  },

  /**
  * Methods
  */
  methods: {
    async getSingleSendout (campaignId, unit) {
      try {
        const url = `${process.env.PHP_CRAWLER_HOST}${ENDPOINTS.GET_SINGLE_SENDOUT}`
          .replace('{account}', unit)
          .replace('{campaignId}', campaignId);
        const { data } = await axios.get(url);
        return data;
      } catch (e) {
        this.logger.error('getSingleSendout Error: ', e);
        throw e;
      }
    }
  },

  /**
  * Service created lifecycle event handler
  */
  created () {

  },

  /**
  * Service started lifecycle event handler
  */
  started () {

  },

  /**
  * Service stopped lifecycle event handler
  */
  stopped () {

  }
};
