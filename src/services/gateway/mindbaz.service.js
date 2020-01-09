'use strict';

const axios = require('axios');

const ENDPOINTS = {
  GET_SINGLE_SENDOUT: '/api/mindbaz/stats/{unit}/id/{sendoutId}'
};

const axiosInstance = axios.create({
  baseURL: process.env.PHP_CRAWLER_HOST
});

module.exports = {
  name: 'gateway_mindbaz',
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
        const url = ENDPOINTS.GET_SINGLE_SENDOUT
          .replace('{unit}', unit)
          .replace('{sendoutId}', sendoutId);
        const { data } = await axiosInstance.get(url);
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
