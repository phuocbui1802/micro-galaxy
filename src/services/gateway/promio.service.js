'use strict';

const axios = require('axios');

const ENDPOINTS = {
  GET_SINGLE_SENDOUT: '/api/promio/report/{sendoutId}'
};

const axiosInstance = axios.create({
  baseURL: process.env.PHP_CRAWLER_HOST
});

module.exports = {
  name: 'gateway_promio',
  mixins: [],

  /**
   * Service settings
   */
  settings: {},

  /**
   * Service dependencies
   */
  dependencies: [],

  /**
   * Actions
   */
  actions: {
    handleGetSendout (ctx) {
      return this.getSendoutStatById(ctx.params.id, ctx.params.unit);
    }
  },

  /**
   * Events
   */
  events: {},

  /**
   * Methods
   */
  methods: {
    async getSendoutStatById (sendoutId, unit) {
      try {
        const url = ENDPOINTS.GET_SINGLE_SENDOUT.replace('{sendoutId}', sendoutId);
        const { data } = await axiosInstance({
          method: 'GET',
          url,
          params: { unit }
        });
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
