'use strict';

const axios = require('axios');
const uniqid = require('uniqid');
const md5 = require('md5');
const sha1 = require('sha1');

const credentialsService = require('../../mixins/credentials.service.js');
const BadRequestError = require('../../utils/exception/bad_request_error.js');

const ENDPOINTS = {
  CAMPAIGN_SPECIFIC: '/stats/campaign/:campaign_id:',
  CAMPAIGN_BY_DATE: '/stats/campaign?p=1&fromDate=:from_date:&toDate=:to_date:&dateFormat=yyyy-mm-dd'
};
const STATIC_URL = '.slip-emailing.com/sliprestful/bases/';

module.exports = {
  name: 'gateway_slip',
  mixins: [credentialsService],

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

    async handleGetStatOfASendout (ctx) {
      const { sendout_id: sendoutId, unit } = ctx.params;
      const response = await this.getStatisticOfOneSendout(unit, sendoutId);
      return ({
        total: 1,
        message: 'OK',
        sendout: response
      });
    },

    async handleGetStatOfSendoutGroupedByDomains (ctx) {
      const { unit, sendoutId } = ctx.params;
      const { data } = await this.getStatOfSendoutGroupedByDomains(unit, sendoutId);
      return {
        message: 'OK',
        domains: data.result.data
      };
    },

    async handleGetStatOfSendoutByDate (ctx) {
      const { from_date: fromDate, to_date: toDate, unit } = ctx.params;
      const response = await this.getStatisticOfSendoutsByDate(unit, fromDate, toDate);
      return {
        total: response.length,
        message: 'OK',
        sendouts: response
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

    getStatisticOfOneSendout (unit, campaignId) {
      return this.getConfigFromDatabase(unit)
        .then(({ app_id: appId, username, password, base_url: baseUrl }) => {
          let url = 'http://' + baseUrl + STATIC_URL + appId + ENDPOINTS.CAMPAIGN_SPECIFIC;
          url = url.replace(':campaign_id:', campaignId);
          const requestConfig = {
            method: 'GET',
            headers: this.generateHeader(username, password),
            url
          };
          this.logger.info('req: ', requestConfig);

          return axios(requestConfig)
            .then(response => {
              return response.data.result;
            })
            .catch(err => {
              this.logger.error('err: ', err);
              throw new BadRequestError(err.response.data.message);
            });
        });
    },

    getStatisticOfSendoutsByDate (unit, fromDate, toDate) {
      return this.getConfigFromDatabase(unit)
        .then(({ app_id: appId, username, password, base_url: baseUrl }) => {
          let url = 'http://' + baseUrl + STATIC_URL + appId + ENDPOINTS.CAMPAIGN_BY_DATE;
          url = url.replace(':from_date:', fromDate);
          url = url.replace(':to_date:', toDate);
          const requestConfig = {
            method: 'GET',
            headers: this.generateHeader(username, password),
            url
          };

          return axios(requestConfig)
            .then(response => {
              return response.data.result.data;
            });
        });
    },

    async getConfigFromDatabase (unit) {
      const response = await this.getConfigByName(`slip_${unit}`);
      return response.json_config;
    },
    generateHeader (username, password) {
      const date = new Date();
      const nonce = md5(uniqid('nonce_')).substring(0, 16);
      const nonce64 = Buffer.from(nonce).toString('base64');
      const passwordDigest = sha1(nonce + date.toISOString() + password, { asBytes: true });
      const passwordDigest64 = Buffer.from(passwordDigest).toString('base64');

      return { 'X-WSSE': `UsernameToken Username="${username}", PasswordDigest="${passwordDigest64}", Nonce="${nonce64}", Created="${date.toISOString()}"` };
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
