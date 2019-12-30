'use strict';

const axios = require('axios');
const X2JS = require('x2js');
const x2js = new X2JS();

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const BadRequestError = require('../../utils/exception/bad_request_error.js');
const { SYSTEMS, CLIENT_MESSAGE } = require('../../utils/constants.js');

const CONFIG = {
  SUBSCRIBER_API_KEY: 'JzZHipYNjWNliPABV8f8',
  DEFAULT_DAY_DURATION: 10,
  DEFAULT_TYPE: 'newsletter'
};
const ENDPOINTS = {
  LAST_NEWSLETTER: 'Messages',
  SINGLE_MESSAGE: 'Messages/:message_id:',
  SINGLE_MESSAGE_STAT: 'MessageStatistics/:message_id:',
  SINGLE_EMAIL: 'Subscribers'
};
const NON_EXIST_API_RESPONSE = 'Resource with specified ID not found.';

const axiosInstance = axios.create({
  baseURL: process.env.EXPERT_FR_HOST
});

module.exports = {
  name: 'gateway_expertfr',
  mixins: [externalSystemAccountService, formattingService],

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

    async handleGetAllNewsletter (ctx) {
      const messages = await this.getAllNewsletter(ctx.params);
      return {
        total: messages.length,
        message: 'OK',
        messages
      };
    },

    async handleGetStatOfAMessage (ctx) {
      const info = await this.getMessageStat(ctx.params.message_id);
      return {
        message: 'OK',
        info
      };
    },

    async handleDeleteEmailAddress (ctx) {
      const status = await this.deleteSubsubcriber(ctx.params.email_address);

      return {
        message: 'OK',
        status
      };
    },

    handleGetSendout (ctx) {
      return this.getMessageStatByID(ctx.params.system, ctx.params.id);
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

    async getAllNewsletter (options) {
      const messageType = options.type ? options.type : CONFIG.DEFAULT_TYPE;
      const dateDiff = options.diff ? options.diff : CONFIG.DEFAULT_DAY_DURATION;
      const twoDaysBefore = new Date();
      twoDaysBefore.setDate(twoDaysBefore.getDate() - dateDiff);
      const requestConfig = {
        url: ENDPOINTS.LAST_NEWSLETTER,
        method: 'GET',
        data: {
          apiKey: await this.getApiKey(),
          startDate: this.getValidDateString(twoDaysBefore),
          type: messageType
        }
      };
      try {
        const response = await axiosInstance(requestConfig);
        const jsonData = x2js.xml2js(response.data);

        try {
          return jsonData.ApiResponse.Data.Messages.Message;
        } catch (ex) {
          throw new BadRequestError('Wrong structure of response (ApiResponse, Data, Messages, Message)');
        }
      } catch (ex) {
        const jsonData = x2js.xml2js(ex.response.data);
        let errorMessage = '';
        try {
          errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
        } catch (ex) {
          errorMessage = 'Unknown error message';
        }
        throw new BadRequestError(errorMessage);
      }
    },

    async getMessageStat (messageId) {
      let overallUrl = ENDPOINTS.SINGLE_MESSAGE;
      let statUrl = ENDPOINTS.SINGLE_MESSAGE_STAT;
      const apiKey = await this.getApiKey();
      statUrl = statUrl.replace(':message_id:', messageId);
      overallUrl = overallUrl.replace(':message_id:', messageId);
      const overallRequestConfig = {
        url: overallUrl,
        method: 'GET',
        data: { apiKey }
      };
      const statRequestConfig = {
        url: statUrl,
        method: 'GET',
        data: { apiKey }
      };
      return Promise.all([axiosInstance(overallRequestConfig), axiosInstance(statRequestConfig)])
        .then(([overallResponse, statResponse]) => {
          const jsonStat = x2js.xml2js(statResponse.data);
          const jsonOverall = x2js.xml2js(overallResponse.data);
          try {
            const stat = jsonStat.ApiResponse.Data;
            const overall = jsonOverall.ApiResponse.Data;
            return {
              stat,
              overall
            };
          } catch (ex) {
            throw new BadRequestError('Wrong structure of response (ApiResponse, Data, Messages, Message)');
          }
        })
        .catch(ex => {
          const jsonData = x2js.xml2js(ex.response.data);
          let errorMessage = '';
          try {
            errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
          } catch (ex) {
            errorMessage = 'Unknown error message';
          }
          throw new BadRequestError(errorMessage);
        });
    },

    async getMessageStatByID (system, messageId) {
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = system;
      fullReturnData.id = messageId;
      let overallUrl = ENDPOINTS.SINGLE_MESSAGE;
      let statUrl = ENDPOINTS.SINGLE_MESSAGE_STAT;
      const apiKey = await this.getApiKey();
      statUrl = statUrl.replace(':message_id:', messageId);
      overallUrl = overallUrl.replace(':message_id:', messageId);
      const overallRequestConfig = {
        url: overallUrl,
        method: 'GET',
        data: {
          apiKey: apiKey
        }
      };
      const statRequestConfig = {
        url: statUrl,
        method: 'GET',
        data: {
          apiKey: apiKey
        }
      };
      return Promise.all([axiosInstance(overallRequestConfig), axiosInstance(statRequestConfig)])
        .then(([overallResponse, statResponse]) => {
          const jsonStat = x2js.xml2js(statResponse.data);
          const jsonOverall = x2js.xml2js(overallResponse.data);
          try {
            const stat = jsonStat.ApiResponse.Data;
            const overall = jsonOverall.ApiResponse.Data;
            fullReturnData.total = 1;
            fullReturnData.reports = [{ stat, overall }];
            return fullReturnData;
          } catch (ex) {
            throw new BadRequestError('Wrong structure of response (ApiResponse, Data, Messages, Message)');
          }
        })
        .catch(ex => {
          const jsonData = x2js.xml2js(ex.response.data);
          let errorMessage = '';
          let newError = '';
          try {
            errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
          } catch (ex) {
            errorMessage = 'Unknown error message';
          }
          if (errorMessage.localeCompare(NON_EXIST_API_RESPONSE) === 0) {
            fullReturnData.total = 0;
            fullReturnData.reports = [{
              client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
            }];
            newError = fullReturnData;
          } else {
            newError = {
              client_message: errorMessage
            };
          }
          throw newError;
        });
    },

    async deleteSubsubcriber (emailAddress) {
      const url = ENDPOINTS.SINGLE_EMAIL;
      const requestConfig = {
        url,
        method: 'DELETE',
        data: {
          apiKey: await this.getApiKey(),
          email: emailAddress
        }
      };

      try {
        await axiosInstance(requestConfig);
        return 'OK';
      } catch (ex) {
        const jsonData = x2js.xml2js(ex.response.data);
        let errorMessage = '';
        try {
          errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
        } catch (ex) {
          errorMessage = 'Unknown error message';
        }
        throw new BadRequestError(errorMessage);
      }
    },

    async getApiKey () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.EXPERT_FR);

      return accounts[0].token;
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
