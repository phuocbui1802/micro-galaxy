'use strict';

const axios = require('axios');
const moment = require('moment');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const formattingService = require('../../mixins/formatting.service.js');

const { SYSTEMS, USER_IMPORT_STATUS, GENDER, CLIENT_MESSAGE } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_SESSION_ID: '/brmapi/login',
  GET_DATASOURCE: '/brmapi/getdatasources',
  GET_REPORT: '/brmapi/getreport',
  GET_MESSAGES: '/brmapi/getmessages',
  GET_MESSAGE: '/brmapi/getmessage',
  GET_CAMPAIGN: '/brmapi/getcampaign',
  ADD_BLACKLIST: '/brmapi/addtoblacklist',
  DELETE_BLACKLIST: '/brmapi/deletefromblacklist',
  GET_USER: '/brmapi/getrecipients',
  ADD_SINGLE_EMAIL: '/brmapi/modcreaterecipients'
};
const STATUS = {
  OK: 'OK',
  ERROR: 'ERR'
};

module.exports = {
  name: 'gateway_beyond',
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
    handleGetBeyondReports: async function (ctx) {
      const response = await this.getReport(
        new Date(ctx.params.start_date),
        new Date(ctx.params.end_date),
        ctx.params.unit || 'default'
      );

      return {
        total: response.data.reports.length || 0,
        message: STATUS.OK,
        reports: response.data.reports
      };
    },

    async handleGetBeyondCampaignById (ctx) {
      const unit = ctx.params.unit || 'default';
      const sessionId = await this.getValidBeyondCredential(unit);
      const { data } = await this.getCampaignById(sessionId, ctx.params.campaignId);
      const messageId = data.campaign.message_id;
      const messageRes = await this.getMessageById(sessionId, messageId);
      messageRes.data.campaign = data.campaign;

      return messageRes.data;
    },

    async handleGetBeyondUser (ctx) {
      const unit = ctx.params.unit || 'default';
      const recipients = await this.getUserByEmail(ctx.params.email_address, unit);

      return {
        total: recipients.length,
        message: STATUS.OK,
        recipients
      };
    },

    async handleAddEmailToList (ctx) {
      const unit = ctx.params.unit || 'default';
      const response = await this.addEmailToList(ctx.params.list_id, ctx.params, unit);

      return {
        message: STATUS.OK,
        email: ctx.params.email,
        list_id: ctx.params.list_id,
        list_name: ctx.params.list_name,
        system: ctx.params.system,
        country: ctx.params.country,
        status: response
      };
    },

    async handleUnsubscribeEmail (ctx) {
      const { email, unit } = ctx.params;
      const errors = await this.unsubscribeEmail(email, unit || 'default');

      if (errors.length > 0) {
        throw new Error(JSON.stringify(errors));
      }

      return {
        message: STATUS.OK
      };
    },

    async handleAddEmailToBlacklist (ctx) {
      const { email } = ctx.params;
      const errors = await this.addEmailToBlacklist(email);

      if (errors.length > 0) {
        throw new Error(JSON.stringify(errors));
      }

      return {
        message: STATUS.OK
      };
    },

    handleGetSendout (ctx) {
      return this.getReportByID(ctx.params.id);
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
    async getSessionIDUsingSecretKey (user, secret) {
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_SESSION_ID}`;
      const requestConfig = {
        method: 'post',
        url: url,
        data: {
          user: user,
          secret: secret
        }
      };
      const response = await axios(requestConfig);
      return response.data.session_id;
    },

    async getValidBeyondCredential (unit) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.BEYOND, unit);

      return this.getSessionIDUsingSecretKey(accounts[0].client_id, accounts[0].client_secret);
    },

    async getReport (fromDate, toDate, unit) {
      this.logger.info('Getting new report for Beyond');
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_REPORT}`;
      const sessionId = await this.getValidBeyondCredential(unit);

      return axios({
        method: 'post',
        url: url,
        data: {
          session_id: sessionId,
          startdate: fromDate,
          enddate: toDate
        }
      });
    },

    getMessageById (sessionId, messageId) {
      return axios({
        method: 'post',
        headers: { 'content-type': 'application/json' },
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_MESSAGE}`,
        data: {
          session_id: sessionId,
          message_id: messageId
        }
      });
    },

    getCampaignById (sessionId, campaignId) {
      return axios({
        method: 'post',
        headers: { 'content-type': 'application/json' },
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_CAMPAIGN}`,
        data: {
          session_id: sessionId,
          campaign_id: campaignId
        }
      });
    },

    getReportByID (id) {
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = SYSTEMS.BEYOND;
      fullReturnData.id = id;
      fullReturnData.total = 1;
      this.logger.info('Getting new report for Beyond');
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_REPORT}`;
      const requestConfig = {
        method: 'post',
        url: url
      };
      let requestData;
      return this.getValidBeyondCredential()
        .then(beyondCredential => {
          requestData = {
            session_id: beyondCredential.session_id,
            campagne_id: id
          };
          requestConfig.data = requestData;
          return axios(requestConfig).then(
            response => {
              const returnData = response.data.reports;
              if (returnData.length === 0) {
                fullReturnData.total = 0;
                fullReturnData.reports = [{
                  client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
                }];
              } else {
                fullReturnData.reports = returnData;
              }
              return fullReturnData;
            }
          );
        });
    },

    async addEmailToBlacklist (email) {
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.ADD_BLACKLIST}`;
      const errors = [];
      const accounts = await this.getExternalSystemAccount(SYSTEMS.BEYOND);

      for (const account of accounts) {
        this.logger.info(`Adding: ${email} to beyond ${account.unit}`);
        const sessionId = await this.getSessionIDUsingSecretKey(account.client_id, account.client_secret);

        try {
          const { data } = await axios({
            method: 'POST',
            url,
            data: {
              session_id: sessionId,
              emails: [{ email, reason: 'Complaint - From Galaxy' }]
            }
          });
          if (data.status === STATUS.ERROR) {
            errors.push({ email, message: data.msg });
          }
        } catch (e) {
          errors.push({ email, message: e.message });
        }
      }
      return errors;
    },

    async getDataSources (sessionId) {
      const dataSourceUrl = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_DATASOURCE}`;
      const { data } = await axios.post(dataSourceUrl, { session_id: sessionId });
      return data.datasources;
    },

    async getUserByEmail (email, unit) {
      const sessionId = await this.getValidBeyondCredential(unit);
      const dataSources = await this.getDataSources(sessionId);
      const getUserUrl = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_USER}`;
      let recipients = [];

      for (const dataSource of dataSources) {
        const { data: recipientData } = await axios.post(getUserUrl, {
          session_id: sessionId,
          emails: [email],
          source_id: dataSource.source_id,
          allow_duplicates: true
        });

        if (recipientData.recipients.length) {
          const temp = recipientData.recipients.map(recipient => {
            recipient.source_id = dataSource.source_id;
            return recipient;
          });
          recipients = recipients.concat(temp);
        }
      }

      return recipients;
    },

    createEmailObject (email) {
      let anrede = '';
      let gender = '';
      if (email.gender && email.gender.toLowerCase() === GENDER.MALE) {
        anrede = 'Herr';
        gender = 1;
      } else if (email.gender && email.gender.toLowerCase() === GENDER.FEMALE) {
        anrede = 'Frau';
        gender = 0;
      }

      return {
        email: email.email,
        firstname: this.capitaliseFirstChar(email.first_name),
        lastname: this.capitaliseFirstChar(email.last_name),
        anrede,
        gender,
        galaxy_id: email.galaxy_id || '',
        // city: email.city || '',
        land: email.country || '',
        bundesland: email.region || '',
        geoip_city: email.geoip_city || '',
        geoip_country: email.geoip_country || '',
        geoip_zip: email.geoip_zip || '',
        geburtsdatum: email.dob ? moment(email.dob, 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss') : '',
        lieferant: email.supplier || ''
      };
    },

    async checkUserExists (listId, email, sessionId) {
      const response = await axios({
        method: 'POST',
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_USER}`,
        data: {
          session_id: sessionId,
          emails: [email],
          source_id: listId
        }
      });

      return response.data && response.data.recipients && response.data.recipients.length;
    },

    async addEmailToList (listId, body, unit) {
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.ADD_SINGLE_EMAIL}`;
      const sessionId = await this.getValidBeyondCredential(unit);

      const userExists = await this.checkUserExists(listId, body.email, sessionId);

      if (userExists) {
        this.logger.debug('User already exists on Beyond', body.email);
        return USER_IMPORT_STATUS.DUPLICATED;
      }

      const jsonData = {
        session_id: sessionId,
        recipients: [this.createEmailObject(body)],
        source_id: listId,
        return_ids: 1
      };
      const response = await axios({
        method: 'POST',
        url,
        data: jsonData
      });

      if (response.data.status === STATUS.OK) {
        return USER_IMPORT_STATUS.USABLE;
      }

      this.logger.error('Error while adding email to Beyond', response.data);
      return USER_IMPORT_STATUS.FAILED;
    },

    async unsubscribeEmail (email, unit) {
      const sessionId = await this.getValidBeyondCredential(unit);

      const dataSources = await this.getDataSources(sessionId);
      let errors = [];

      for (const dataSource of dataSources) {
        const getUserUrl = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_USER}`;

        const { data: recipientData } = await axios.post(getUserUrl, {
          session_id: sessionId,
          emails: [email],
          source_id: dataSource.source_id,
          allow_duplicates: true
        });

        if (recipientData.recipients.length) {
          const results = await this.unsubscribeFollowListRecipients(recipientData.recipients, dataSource, sessionId);
          errors = errors.concat(results);
        }
      }
      return errors;
    },

    async unsubscribeFollowListRecipients (recipients, dataSource, sessionId) {
      const errors = [];
      const unsubUrl = `${process.env.BEYOND_HOST}${ENDPOINTS.ADD_SINGLE_EMAIL}`;
      const dateUnJoin = moment().format('YYYY-MM-DD HH:mm:ss');
      try {
        recipients = recipients.map(recipient => {
          recipient.dateunjoin = dateUnJoin;
          return recipient;
        });
        const { data } = await axios.post(unsubUrl, {
          session_id: sessionId,
          recipients: recipients,
          source_id: dataSource.source_id,
          return_ids: 1
        });
        if (data.status === STATUS.ERROR) {
          data.sourceId = dataSource.source_id;
          errors.push(data);
        }
      } catch (e) {
        this.logger.error('Error unsubscribeEmail: ', e);
        errors.push({
          status: 'ERR',
          msg: e.message,
          sourceId: dataSource.source_id
        });
      }
      return errors;
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
