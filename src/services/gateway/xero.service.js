'use strict';

const Xero = require('xero');
const fs = require('fs');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const PRIVATE_KEY = fs.readFileSync('./storage/keys/xero_key.pem');
const { SYSTEMS } = require('../../utils/constants.js');

const ENDPOINTS = {
  SINGLE_INVOICE: '/Invoices/:invoice_number:'
};

module.exports = {
  name: 'gateway_xero',
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
    async handleGetInvoiceByNumber (ctx) {
      const invoice = await this.getInvoiceByInvoiceNumber(ctx.params.invoice_number);

      return {
        total: 1,
        message: 'OK',
        invoice
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
    async getInvoiceByInvoiceNumber (invoiceNumber) {
      const xero = await this.getXero();

      return new Promise(resolve => {
        this.logger.info('Getting invoice ', invoiceNumber, ' from xero');
        let url = ENDPOINTS.SINGLE_INVOICE;
        url = url.replace(':invoice_number:', invoiceNumber);
        xero.call('GET', url, null, (err, json) => {
          if (err) {
            this.logger.error('err: ', err);
            resolve(null);
          } else {
            this.logger.debug('REMOVEME - invoice: ', json);
            resolve(json.Response.Invoices.Invoice);
          }
        });
      });
    },

    async getXero () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.XERO);

      return new Xero(accounts[0].client_id, accounts[0].client_secret, PRIVATE_KEY);
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
