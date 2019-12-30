'use strict';

const axios = require('axios');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');

const ENDPOINTS = {
  INVOICE: '/rest/v1/documents?type=INVOICE',
  SINGLE_DOCUMENT: '/rest/v1/documents?number=:document_number:'
};

const axiosInstance = axios.create({
  baseURL: process.env.EASY_HOST
});

module.exports = {
  name: 'gateway_easy',
  mixins: [externalSystemAccountService],

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
    async handleGetDocumentByDocumentNumber (ctx) {
      const { document_number: documentNumber, unit } = ctx.params;
      const response = await this.getDocumentByDocumentNumber(documentNumber, unit);

      return {
        total: 1,
        message: 'OK',
        invoice: response
      };
    },

    async handleGetAllInvoices (ctx) {
      const response = await this.getAllInvoices();

      return {
        total: response.length,
        message: 'OK',
        invoices: response
      };
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
    async getAllInvoices (unit = 'U1') {
      const response = await axiosInstance({
        method: 'get',
        url: ENDPOINTS.INVOICE,
        headers: await this.getDefaultHeader(unit)
      });

      return response.data.items;
    },

    async getDocumentByDocumentNumber (documentNumber, unit = 'U1') {
      let url = ENDPOINTS.SINGLE_DOCUMENT.replace(':document_number:', documentNumber);

      const response = await axiosInstance({
        method: 'get',
        url,
        headers: await this.getDefaultHeader(unit)
      });

      return response.data.items;
    },

    async getDefaultHeader (unit) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.EASY, unit);

      return {
        Authorization: `Bearer ${accounts[0].token}`
      };
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
