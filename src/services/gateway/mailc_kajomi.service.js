'use strict';

const axios = require('axios');
const moment = require('moment/moment.js');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const { SYSTEMS, CLIENT_MESSAGE, USER_IMPORT_STATUS } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_DONE_MAILINGS: '/mailings?filter=sendq',
  GET_LIST_SETTINGS: '/lists/settings',
  GET_SINGLE_MAILINGS: '/statistics?mailing_ids=:mailing_id:',
  SINGLE_EMAIL: '/users',
  ADD_SINGLE_EMAIL: '/list/:list_id:/users',
  UPDATE_SINGLE_EMAIL: '/list/:list_id:/user/:user_id:',
  GET_ALL_LISTS: '/lists',
  ADD_DOMAIN_TO_BLACKLIST: '/lists/blacklist/items'
};
const DUPLICATED_MESSAGE = 'email already exists';

const axiosInstance = axios.create({
  baseURL: process.env.MAILC_KAJOMI_HOST
});

let idQueue = [];

module.exports = {
  name: 'gateway_mailc_kajomi',
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
    async handleGetMailcKajomiNewReport (ctx) {
      const response = await this.getKajomiNextReport();

      return {
        message: 'OK',
        mailing: response
      };
    },

    async handleGetAllLists (ctx) {
      const lists = await this.getAllLists();

      return {
        total: lists.length,
        message: 'OK',
        system: 'Kajomi_Mailc',
        lists: lists
      };
    },

    async handleAddEmailToList (ctx) {
      const status = await this.addEmailToList(
        ctx.params.list_id,
        ctx.params,
        ctx.params.overwrite_data
      );

      return {
        message: 'OK',
        email: ctx.params.email,
        list_id: ctx.params.list_id,
        list_name: ctx.params.list_name,
        system: ctx.params.system,
        country: ctx.params.country,
        status
      };
    },

    handleGetSendout (ctx) {
      return this.getKajomiReportOfAMailing(ctx.params.unit, ctx.params.id);
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

    async getMailcKajomiDefaultHeader () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.MAILC_KAJOMI);

      return {
        Authorization: `Bearer ${accounts[0].token}`
      };
    },

    getKajomiDoneMailings () {
      if (idQueue && idQueue.length) {
        return Promise.resolve([]);
      } else {
        const url = `${ENDPOINTS.GET_DONE_MAILINGS}`;
        return this.getMailcKajomiDefaultHeader()
          .then(header => {
            const requestConfig = {
              method: 'GET',
              url: url,
              headers: header
            };
            return axiosInstance(requestConfig)
              .then(response => {
                let mailings = response.data.data;
                mailings.sort((a, b) => a.datesent < b.datesent ? 1 : -1);
                const currentTime = new Date('2018-07-01');
                mailings = mailings.filter(mailing => {
                  const senddate = new Date(mailing.datesent);
                  return senddate > currentTime && mailing.amount > 10;
                });
                idQueue = mailings.map(mailing => mailing.id);
                return null;
              });
          });
      }
    },

    getKajomiReportOfAMailing (mailingId) {
      let url = `${ENDPOINTS.GET_SINGLE_MAILINGS}`;
      url = url.replace(':mailing_id:', mailingId);
      return this.getMailcKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'GET',
            url: url,
            headers: header
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data.data;
            });
        })
        .catch(err => {
          this.logger.error('Err: ', err);
        });
    },

    getKajomiReportOfAMailingByID (system, mailingId) {
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = system;
      fullReturnData.id = mailingId;
      fullReturnData.total = 1;
      let url = `${ENDPOINTS.GET_SINGLE_MAILINGS}`;
      url = url.replace(':mailing_id:', mailingId);
      return this.getMailcKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'GET',
            url: url,
            headers: header
          };
          return axiosInstance(requestConfig)
            .then(response => {
              const returnData = response.data.data;
              if (returnData.length === 0) {
                fullReturnData.total = 0;
                fullReturnData.reports = [{
                  client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
                }];
              } else {
                fullReturnData.reports = returnData;
              }
              return fullReturnData;
            });
        })
        .catch(err => {
          this.logger.err('REMOVEME - err: ', err);
        });
    },

    getKajomiNextReport () {
      return this.getKajomiDoneMailings()
        .then(() => {
          const processingId = idQueue.splice(idQueue.length - 1, 1)[0];
          return this.getKajomiReportOfAMailing(processingId);
        });
    },

    async addEmailToList (listId, body, overwriteData) {
      let url = `${ENDPOINTS.ADD_SINGLE_EMAIL}`;
      url = url.replace(':list_id:', listId);

      body.dob = body.dob ? moment(body.dob, 'YYYY-MM-DD').toISOString().split('T')[0] : '';
      body.city = body.city ? body.city : '';
      body.country = body.country ? body.country : '';
      body.first_name = body.first_name ? body.first_name : '';
      body.last_name = body.last_name ? body.last_name : '';
      body.gender = body.gender ? body.gender : '';
      body.region = body.region ? body.region : '';
      body.zip = body.zip ? body.zip : '';
      body.geoip_city = body.geoip_city ? body.geoip_city : '';
      body.geoip_country = body.geoip_country ? body.geoip_country : '';
      body.geoip_zip = body.geoip_zip ? body.geoip_zip : '';
      body.geoip_state = body.geoip_state ? body.geoip_state : '';

      if (body.gender.toLowerCase() === 'm') {
        body.gender = 1;
      } else if (body.gender.toLowerCase() === 'f') {
        body.gender = 2;
      }
      const jsonData = {
        email: body.email,
        firstname: this.capitaliseFirstChar(body.first_name),
        lastname: this.capitaliseFirstChar(body.last_name),
        sex: body.gender,
        country: body.country,
        city: this.capitaliseFirstChar(body.city),
        birthdate: body.dob,
        area_code: body.region,
        user1: body.supplier,
        postcode: body.zip,
        user2: body.md5,
        user3: body.galaxy_id,
        user4: body.geoip_city,
        user5: body.geoip_state,
        user6: body.geoip_zip,
        user7: body.geoip_country
      };
      const header = await this.getMailcKajomiDefaultHeader();
      header['Content-Type'] = 'application/json';
      try {
        await axiosInstance.post(
          url,
          jsonData,
          {
            headers: header
          }
        );

        return USER_IMPORT_STATUS.USABLE;
      } catch (err) {
        const errMess = err.response.statusText;

        if (errMess && errMess.toLowerCase().includes(DUPLICATED_MESSAGE)) {
          if (overwriteData === 'true') {
            let duplicateUrl = `${ENDPOINTS.UPDATE_SINGLE_EMAIL}`;
            duplicateUrl = duplicateUrl.replace(':list_id:', listId);
            const userId = errMess.split('/')[errMess.split('/').length - 1];
            duplicateUrl = duplicateUrl.replace(':user_id:', userId);
            delete jsonData.postcode;
            delete jsonData.area_code;
            const duplicatedRequestConfig = {
              method: 'PUT',
              url: duplicateUrl,
              data: jsonData,
              headers: header
            };

            try {
              await axiosInstance(duplicatedRequestConfig);
            } catch (e) {
              return USER_IMPORT_STATUS.FAILED;
            }
          }

          return USER_IMPORT_STATUS.DUPLICATED;
        }

        return USER_IMPORT_STATUS.FAILED;
      }
    },

    getAllLists () {
      const url = `${ENDPOINTS.GET_ALL_LISTS}`;
      return this.getMailcKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'GET',
            url: url,
            headers: header
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data.data.map(list => {
                return {
                  id: list.listnum,
                  name: list.title
                };
              });
            })
            .catch(err => {
              throw err;
            });
        });
    },

    handleGetSendout (ctx) {
      return this.getKajomiReportOfAMailingByID(ctx.params.id, ctx.params.unit);
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
