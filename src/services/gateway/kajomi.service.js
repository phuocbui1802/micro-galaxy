'use strict';

const axios = require('axios');
const moment = require('moment');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const credentialsService = require('../../mixins/credentials.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const { SYSTEMS, CLIENT_MESSAGE, USER_IMPORT_STATUS } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_DONE_MAILINGS: '/mailings?filter=sendq',
  GET_LIST_SETTINGS: '/lists/settings',
  GET_SINGLE_MAILINGS: '/statistics?mailing_ids=:mailing_id:',
  GET_DETAILS_MAILING: '/mailing/:mailingId:',
  SINGLE_EMAIL: '/users',
  ADD_SINGLE_EMAIL: '/list/:list_id:/users',
  UPDATE_SINGLE_EMAIL: '/list/:list_id:/user/:user_id:',
  GET_ALL_LISTS: '/lists',
  ADD_DOMAIN_TO_BLACKLIST: '/lists/blacklist/items'
};
const DUPLICATED_MESSAGE = 'email already exists';
const DATE_DIFF = 10;

const axiosInstance = axios.create({
  baseURL: process.env.KAJOMI_HOST
});

const idQueue = {};

module.exports = {
  name: 'gateway_kajomi',
  mixins: [externalSystemAccountService, credentialsService, formattingService],

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

    async handleGetKajomiEmailInfo (ctx) {
      const response = await this.getEmailInfo(ctx.params.email_address);
      return {
        total: response.data.length,
        message: 'OK',
        records: response.data
      };
    },

    async handleGetKajomiNewReport (ctx) {
      const response = await this.getKajomiNextReport(ctx.params.unit || 'as');
      const { data: mailingData } = await this.getMailingById(
        ctx.params.unit || 'as',
        response[0].mailing_id
      );
      response[0].htcontent = mailingData.htcontent;

      return {
        message: 'OK',
        mailing: response
      };
    },

    async handleGetKajomiReportOfAMailing (ctx) {
      const response = await this.getKajomiReportOfAMailing(
        ctx.params.unit || 'as',
        ctx.params.mailing_id
      );

      return {
        message: 'OK',
        mailing: response
      };
    },

    async handleGetMailingById (ctx) {
      const { data: mailingData } = await this.getMailingById(
        ctx.params.unit || 'as',
        ctx.params.mailingId
      );

      return {
        message: 'OK',
        mailing: {
          id: mailingData.id,
          senderName: mailingData.sendername,
          senderEmail: mailingData.senderemail,
          description: mailingData.description,
          subject: mailingData.subject,
          content: mailingData.content,
          htContent: mailingData.htcontent
        }
      };
    },

    async handleDeleteEmailInKajomi (ctx) {
      const deleteCount = await this.deleteEmailAddress(ctx.params.email_address);
      return {
        total: deleteCount,
        message: 'OK'
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

    async handleGetAllLists (ctx) {
      const { unit } = ctx.params;
      const lists = await this.getAllLists(unit || 'as');

      return {
        total: lists.length,
        message: 'OK',
        system: (unit && unit !== 'as') ? `Kajomi_${unit}` : 'Kajomi_Default',
        lists: lists
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

    async getKajomiDefaultHeader (unit) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.KAJOMI, unit || 'as');

      return {
        Authorization: `Bearer ${accounts[0].token}`
      };
    },

    getKajomiDoneMailings (unit) {
      if (idQueue[unit] && idQueue[unit].length) {
        return Promise.resolve([]);
      } else {
        return this.getKajomiDefaultHeader(unit)
          .then(header => {
            const requestConfig = {
              method: 'GET',
              url: ENDPOINTS.GET_DONE_MAILINGS,
              headers: header
            };
            return axiosInstance(requestConfig)
              .then(response => {
                let mailings = response.data.data;
                mailings.sort((a, b) => a.datesent < b.datesent ? 1 : -1);
                const currentTime = new Date();
                currentTime.setDate(currentTime.getDate() - DATE_DIFF);
                mailings = mailings.filter(mailing => {
                  const senddate = new Date(mailing.datesent);
                  return senddate > currentTime && mailing.amount > 10;
                });
                idQueue[unit] = mailings.map(mailing => mailing.id);
                return null;
              });
          });
      }
    },

    getKajomiReportOfAMailing (unit, mailingId) {
      let url = ENDPOINTS.GET_SINGLE_MAILINGS.replace(':mailing_id:', mailingId);
      return this.getKajomiDefaultHeader(unit)
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
          throw err;
        });
    },

    getKajomiReportOfAMailingByID (system, mailingId) {
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = system;
      fullReturnData.id = mailingId;
      fullReturnData.total = 1;
      let url = `${ENDPOINTS.GET_SINGLE_MAILINGS}`;
      url = url.replace(':mailing_id:', mailingId);
      return this.getKajomiDefaultHeader()
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
          throw err;
        });
    },

    getKajomiNextReport (unit) {
      return this.getKajomiDoneMailings(unit)
        .then(() => {
          const processingId = idQueue[unit].splice(idQueue.length - 1, 1)[0];
          return this.getKajomiReportOfAMailing(unit, processingId);
        });
    },

    getKajomiListSettings () {
      const url = `${ENDPOINTS.GET_LIST_SETTINGS}`;
      return this.getKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'GET',
            url: url,
            headers: header
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data;
            });
        });
    },

    getEmailInfo (emailAddress) {
      return this.getKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'PUT',
            url: ENDPOINTS.SINGLE_EMAIL,
            headers: header,
            data: {
              selection: `email == "${emailAddress}"`,
              fields: [
                'email',
                'list'
              ],
              limit: 100,
              count: false
            }
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data;
            });
        });
    },

    deleteEmailAddress (emailAddress) {
      return this.getKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'DELETE',
            url: ENDPOINTS.SINGLE_EMAIL,
            headers: header,
            data: {
              selection: `email == "${emailAddress}"`
            }
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data.count;
            });
        });
    },

    async addEmailToList (listId, body, overwriteData) {
      let url = ENDPOINTS.ADD_SINGLE_EMAIL.replace(':list_id:', listId);

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

      const header = await this.getKajomiDefaultHeader();
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
            let duplicateUrl = ENDPOINTS.UPDATE_SINGLE_EMAIL;
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

    getAllLists (unit) {
      return this.getKajomiDefaultHeader(unit)
        .then(header => {
          const requestConfig = {
            method: 'GET',
            url: ENDPOINTS.GET_ALL_LISTS,
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

    addDomainToBlacklist (domain) {
      return this.getKajomiDefaultHeader()
        .then(header => {
          const requestConfig = {
            method: 'POST',
            url: ENDPOINTS.ADD_DOMAIN_TO_BLACKLIST,
            data: {
              value: domain
            },
            headers: header
          };
          return axiosInstance(requestConfig)
            .then(response => {
              return response.data;
            })
            .catch(err => {
              throw err.response.data.error;
            });
        });
    },

    async getMailingById (unit, mailingId) {
      const header = await this.getKajomiDefaultHeader(unit);
      return axiosInstance({
        method: 'GET',
        url: ENDPOINTS.GET_DETAILS_MAILING.replace(':mailingId:', mailingId),
        headers: header
      });
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
