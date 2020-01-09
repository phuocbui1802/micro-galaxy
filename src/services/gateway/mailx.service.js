'use strict';

const axios = require('axios');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');

const ENDPOINTS = {
  CAMPAIGN_LISTS: '/api/campaign/lists/6',
  CAMPAIGN_STAT: '/api/statistics/campaign/:campaign_id:'
};
const CREDENTIALS = {
  DOMAIN: 'evania.de'
};

const axiosInstance = axios.create({
  baseURL: process.env.MAILX_HOST
});

module.exports = {
  name: 'gateway_mailx',
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

    async handleGetAllDoneList (ctx) {
      const campaigns = await this.getAllDoneCampaignList();

      return {
        total: campaigns.length,
        message: 'OK',
        campaigns
      };
    },

    async handleGetSingleReport (ctx) {
      const report = await this.getSingleReport(ctx.params.mailing_id);

      return ({
        message: 'OK',
        report
      });
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

    async getAllDoneCampaignList () {
      const requestConfig = {
        method: 'get',
        url: ENDPOINTS.CAMPAIGN_LISTS,
        headers: await this.getDefaultHeader()
      };
      try {
        const response = await axiosInstance(requestConfig);
        return response.data;
      } catch (e) {
        this.logger.error('Error when get done campaign list from mailx: ', e.response);
      }
    },

    async getSingleReport (mailingId) {
      const requestConfig = {
        method: 'get',
        url: ENDPOINTS.CAMPAIGN_STAT.replace(':campaign_id:', mailingId),
        headers: await this.getDefaultHeader()
      };
      this.logger.debug('REMOVEME - req: ', requestConfig);
      try {
        const response = await axiosInstance(requestConfig);
        this.logger.debug('REMOVEME - res: ', response.data);

        return response.data;
      } catch (err) {
        this.logger.error('Error when get done campaign list from mailx: ', err.response);
      }
    },

    async getDefaultHeader () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.MAILX);

      return {
        'Application-key': accounts[0].client_id,
        'Token-api': accounts[0].token,
        'Type-Response': 'json',
        Referer: CREDENTIALS.DOMAIN
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
