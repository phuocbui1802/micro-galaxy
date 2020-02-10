'use strict';

const qs = require('qs');
const axios = require('axios');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');
const BadRequestError = require('../../utils/exception/bad_request_error.js');

const ENDPOINTS = {
  AUTHENTICATION: '/oauth/token',
  QUERY_INVOICE_NUMBER: '/accounting/invoices/search/number'
};

const axiosInstance = axios.create({
  baseURL: process.env.CONTASIMPLE_HOST
});

module.exports = {
  name: 'gateway_contasimple',
  mixins: [externalSystemAccountService],

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
    async handleGetContasimpleInvoiceByNumber (ctx) {
      const response = await this.getInvoiceByNumber(ctx.params.number);

      return {
        message: 'OK',
        total: response.length,
        invoices: response
      };
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
    async getAccessToken () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.CONTASIMPLE);

      const requestConfig = {
        method: 'POST',
        url: ENDPOINTS.AUTHENTICATION,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify({
          grant_type: 'authentication_key',
          key: accounts[0].token
        })
      };

      const response = await axiosInstance(requestConfig);

      return response.data.access_token;
    },

    async getInvoiceByNumber (number) {
      const token = await this.getAccessToken();

      if (token) {
        const requestConfig = {
          method: 'GET',
          url: ENDPOINTS.QUERY_INVOICE_NUMBER,
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            query: number
          }
        };
        try {
          const response = await axiosInstance(requestConfig);

          return response.data.data;
        } catch (e) {
          throw new BadRequestError('Can\'t get invoice by number');
        }
      }

      throw new BadRequestError('Token is not available');
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
