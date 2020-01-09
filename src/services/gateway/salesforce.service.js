'use strict';

const axios = require('axios');
const X2JS = require('x2js/x2js.js');
const fs = require('fs');
const moment = require('moment/moment.js');
// const authenUtil = require('../util/authen.js');

const credentialsService = require('../../mixins/credentials.service.js');
const { SALESFORCE } = require('../../utils/constants.js');

const ENDPOINTS = {
  LOGIN: '/services/oauth2/token',
  USERS: '/services/data/v40.0/sobjects/User',
  CUSTOM_QUERY: '/services/data/v40.0/query',
  SINGLE_ACCOUNT: '/services/data/v40.0/sobjects/Account/:account_id:',
  SINGLE_USER: '/services/data/v40.0/sobjects/User/:user_id:',
  SINGLE_LIST: '/services/data/v40.0/sobjects/List__c/:list_id:',
  SINGLE_LIST_UPLOAD: '/services/data/v40.0/sobjects/List_upload__c/:list_upload_id:',
  SINGLE_OPP: '/services/data/v40.0/sobjects/Opportunity/:opp_id:',
  SINGLE_CURRENCY: '/services/data/v40.0/sobjects/CurrencyType/:currency_id:',
  NEWLY_USER: '/services/data/v40.0/sobjects/User/updated/?start=:start_date:&end=:end_date:',
  NEWLY_DELETED_OPP: '/services/data/v40.0/sobjects/Opportunity/deleted/?start=:start_date:&end=:end_date:',
  BULK_JOB: '/services/data/v40.0/jobs/ingest/',
  UPLOAD_BULK_DATA: '/services/data/v40.0/jobs/ingest/:jobId/batches'
};

const SALESFORCE_CONFIG_NAME = 'salesforce_production';
const DAY_DIFF = 1;

let nextAccountUrl = null;
let nextOppUrl = null;
let newlyUserID = [];
const newlyAccountID = [];
const newlyOpportunityID = [];
const x2js = new X2JS();

let salesforceInfo = null;

module.exports = {
  name: 'gateway_salesforce',
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

    async handleGetAllCurrency (ctx) {
      const response = await this.getAllCurrencies();
      return {
        total: response.data.records.length,
        message: 'OK',
        currencies: response.data.records
      };
    },

    async handleGetSalesForceUser (ctx) {
      const response = await this.getAllUsers();
      return {
        total: response.data.records.length,
        message: 'OK',
        users: response.data.records
      };
    },

    async handleGetSalesForceLists (ctx) {
      const response = await this.getAllLists();
      return {
        total: response.data.records.length,
        message: 'OK',
        lists: response.data.records
      };
    },

    async handleGetSalesForceListUploads (ctx) {
      const response = await this.getAllListUploads();
      return {
        total: response.data.records.length,
        message: 'OK',
        list_uploads: response.data.records
      };
    },

    async handleGetSalesForceAccount (ctx) {
      const response = await this.getAllAccounts();
      return {
        total: response.data.records.length,
        message: 'OK',
        accounts: response.data.records
      };
    },

    async handleGetSalesForceOpportunity (ctx) {
      const response = await this.getAllOpportunities();
      return {
        total: response.data.records.length,
        message: 'OK',
        opportunities: response.data.records
      };
    },

    async handleGetNewlySalesForceUser (ctx) {
      const users = await this.getNewlySalesForceUser();
      return {
        total: users.length,
        message: 'OK',
        users
      };
    },

    async handleGetNewlySalesForceAccount (ctx) {
      const accounts = await this.getNewlySalesForceAccount();
      return {
        total: accounts.length,
        message: 'OK',
        accounts
      };
    },

    async handleGetNewlySalesForceOpportunity (ctx) {
      const opportunities = await this.getNewlySalesForceOpportunity();
      return {
        total: opportunities.length,
        message: 'OK',
        opportunities
      };
    },

    async handleGetSalesForceOpportunityWithEmptyUrl (ctx) {
      const opportunities = await this.getOpportunityWithEmptyUrl();
      return {
        total: opportunities.length,
        message: 'OK',
        opportunities
      };
    },

    async handleGetNewlyDeleteOpportunities (ctx) {
      const opportunities = await this.getNewlyDeletedOpportunities();
      return {
        total: opportunities.length,
        message: 'OK',
        opportunities
      };
    },

    async handleGetSpecificOpp (ctx) {
      const { opportunity_id: opportunityId } = ctx.params;
      const opportunity = await this.getOpportunityInfoByID(opportunityId);

      return {
        total: 1,
        message: 'OK',
        opportunities: [opportunity]
      };
    },

    async handleGetSpecificListUpload (ctx) {
      const { list_upload_id: ListUploadId } = ctx.params;
      const listUpload = await this.getListUploadByID(ListUploadId);
      return {
        total: 1,
        message: 'OK',
        list_uploads: [listUpload]
      };
    },

    async handleGetSpecificList (ctx) {
      const { list_id: listId } = ctx.params;
      const list = await this.getListByID(listId);
      return {
        total: 1,
        message: 'OK',
        lists: [list]
      };
    },

    async handleGetSpecificAccount (ctx) {
      const { account_id: accountId } = ctx.params;
      const account = await this.getAccountInfoByID(accountId);

      return {
        total: 1,
        message: 'OK',
        accounts: [account]
      };
    },

    async handleUpdateOpportunity (ctx) {
      const { opportunity_id: opportunityId } = ctx.params;
      const { opportunity } = ctx.params;
      opportunity.id = opportunityId;
      const updatedOpportunity = await this.updateOpportunity(opportunity);
      return {
        total: 1,
        message: 'OK',
        opportunity: updatedOpportunity
      };
    },

    async handleUpdateOpportunityMeasurements (ctx) {
      const { opportunity_id: opportunityId } = ctx.params;
      const { opportunity } = ctx.params;
      opportunity.id = opportunityId;
      const updatedOpportunityId = await this.updateOpportunityMeasurements(opportunity);
      return {
        total: 1,
        message: 'OK',
        id: updatedOpportunityId
      };
    },

    async handleUpdateCurrency (ctx) {
      const { currency_id: currencyId } = ctx.params;
      const { currency } = ctx.params;
      currency.id = currencyId;
      const updatedCurrency = await this.updateCurrencyRate(currency);
      return {
        total: 1,
        message: 'OK',
        currency: updatedCurrency
      };
    },

    async handleGetECBUpdatedRate (ctx) {
      const updatedRates = await this.getECBUpdateRate();
      return {
        total: 1,
        message: 'OK',
        rates: updatedRates
      };
    },

    async handleCreateBulkSendoutUpdateJob (ctx) {
      const response = await this.createBulkUpdateJob(SALESFORCE.OBJECTS.SENDOUT);
      return {
        jobId: response.id,
        message: 'OK'
      };
    },

    async handleCreateBulkOpportunityUpdateJob (ctx) {
      const response = await this.createBulkUpdateJob(SALESFORCE.OBJECTS.OPPORTUNITY);

      return {
        jobId: response.id,
        message: 'OK'
      };
    },

    async handleUploadBulkUpdateJob (ctx) {
      const { jobId } = ctx.params;
      await this.uploadBulkUpdateJob(jobId, ctx.params.file.path);

      return {
        message: 'OK'
      };
    },

    async handleCloseBulkUpdateJob (ctx) {
      const { jobId } = ctx.params;
      await this.closeBulkUpdateJob(jobId);

      return {
        message: 'OK'
      };
    },

    async handleGetBulkUpdateJob (ctx) {
      const { jobId } = ctx.params;
      const response = await this.getBulkUpdateJob(jobId);

      return {
        message: 'OK',
        data: response
      };
    },

    async handleGetUrls (ctx) {
      const response = await this.getAllUrls(ctx.params.from);

      return {
        message: 'OK',
        data: response
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
    getValidAccessToken () {
      if (salesforceInfo) {
        return this.verifyAccessToken()
          .then(result => {
            if (result) {
              return salesforceInfo;
            } else {
              return this.getAccessTokenWithCredentials();
            }
          });
      } else {
        return this.getAccessTokenWithCredentials();
      }
    },

    verifyAccessToken () {
      const url = `${salesforceInfo.instance_url}${ENDPOINTS.USERS}`;
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: `Bearer ${salesforceInfo.access_token}`
        }
      };
      return axios(requestConfig)
        .then(() => true)
        .catch(() => false);
    },

    async getAccessTokenWithCredentials () {
      let jsonConfig;

      if (process.env.NODE_ENV === 'production') {
        const response = await this.getConfigByName(SALESFORCE_CONFIG_NAME);
        jsonConfig = response.json_config;
      } else {
        jsonConfig = {
          CLIENT_ID: process.env.SALESFORCE_CLIENT_ID,
          CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET,
          USER_NAME: process.env.SALESFORCE_USER_NAME,
          PASSWORD: process.env.SALESFORCE_PASSWORD,
          TOKEN: process.env.SALESFORCE_TOKEN,
          LOGIN_HOST: process.env.SALESFORCE_LOGIN_HOST
        };
      }

      const url = `${jsonConfig.LOGIN_HOST}${ENDPOINTS.LOGIN}`;
      const params = {
        grant_type: 'password',
        client_id: jsonConfig.CLIENT_ID,
        client_secret: jsonConfig.CLIENT_SECRET,
        username: jsonConfig.USER_NAME,
        password: jsonConfig.PASSWORD + jsonConfig.TOKEN
      };
      const requestConfig = {
        method: 'post',
        url,
        params
      };
      try {
        const response = await axios(requestConfig);
        const result = response.data;
        salesforceInfo = {
          access_token: `Bearer ${result.access_token}`,
          instance_url: result.instance_url
        };
        return salesforceInfo;
      } catch (err) {
        this.logger.error('Error when login salesforce: ', err);
      }
    },

    getAllUsers () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const requestConfig = {
            method: 'get',
            url: `${hostName}${ENDPOINTS.CUSTOM_QUERY}`,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params: {
              q: 'SELECT id, email, firstName, lastName FROM user'
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce users API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getAllLists () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const requestConfig = {
            method: 'get',
            url: `${hostName}${ENDPOINTS.CUSTOM_QUERY}`,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params: {
              q: `SELECT id,
                         OwnerId,
                         Account__c,
                         GEO__c,
                         Name,
                         Volume__c,
                         Type__c,
                         List_manager__c,
                         Sending_cost_paid_by__c,
                         Lead_s_age__c,
                         Footer__c,
                         Share__c,
                         Branch__c
                  FROM List__c`
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce List API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getAllListUploads () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const requestConfig = {
            method: 'get',
            url: `${hostName}${ENDPOINTS.CUSTOM_QUERY}`,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params: {
              q: 'SELECT id, name, sending_system_id__c, sending_system__c, List__c, List_upload_manager__c FROM List_upload__c'
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce List uploads API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getAllCurrencies () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const requestConfig = {
            method: 'get',
            url: `${hostName}${ENDPOINTS.CUSTOM_QUERY}`,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params: {
              q: 'SELECT id, isocode, conversionrate FROM CurrencyType LIMIT 500'
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce currency API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getAllAccounts () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const url = nextAccountUrl ? hostName + nextAccountUrl : hostName + ENDPOINTS.CUSTOM_QUERY;
          const params = nextAccountUrl ? null : {
            q: 'SELECT id, sugarID__c FROM account'
          };
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              nextAccountUrl = response.data.nextRecordsUrl;
              const endTime = Date.now();
              this.logger.info('SalesForce accounts API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getAllOpportunities () {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          const url = nextOppUrl ? hostName + nextOppUrl : hostName + ENDPOINTS.CUSTOM_QUERY;
          const params = nextOppUrl ? null : {
            q: 'SELECT id, sugarID__c FROM opportunity'
          };
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            params
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              nextOppUrl = response.data.nextRecordsUrl;
              const endTime = Date.now();
              this.logger.info('SalesForce opportunities API done in: ', endTime - startTime, ' ms');
              return response;
            });
        });
    },

    getNewlySalesForceUser () {
      return Promise.resolve()
        .then(() => {
          if (newlyUserID.length) {
            return newlyUserID;
          } else {
            return this.getValidAccessToken()
              .then(salesforceInfo => {
                const hostName = salesforceInfo.instance_url;
                let url = hostName + ENDPOINTS.NEWLY_USER;
                let dateEnd = new Date();
                let dateStart = new Date(dateEnd);
                dateStart.setDate(dateStart.getDate() - DAY_DIFF);
                dateStart = dateStart.toISOString().split('.')[0];
                dateEnd = dateEnd.toISOString().split('.')[0];
                dateStart += '+00:00';
                dateEnd += '+00:00';
                url = url.replace(':start_date:', encodeURIComponent(dateStart));
                url = url.replace(':end_date:', encodeURIComponent(dateEnd));
                const requestConfig = {
                  method: 'get',
                  url,
                  headers: {
                    Authorization: salesforceInfo.access_token
                  }
                };

                const startTime = Date.now();
                return axios(requestConfig)
                  .then(response => {
                    newlyUserID = response.data.ids;
                    const endTime = Date.now();
                    this.logger.info('SalesForce newly user API done in: ', endTime - startTime, ' ms');
                    return newlyUserID;
                  });
              });
          }
        })
        .then(() => {
          if (newlyUserID && newlyUserID.length) {
            const userId = newlyUserID[0];
            newlyUserID.splice(0, 1);
            return this.getUserInfoByID(userId)
              .then(user => [user]);
          } else {
            return [];
          }
        });
    },

    getUserInfoByID (userId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_USER;
          url = url.replace(':user_id:', userId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };
          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single user API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    getListUploadByID (listUploadId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_LIST_UPLOAD;
          url = url.replace(':list_upload_id:', listUploadId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single list upload API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    getListByID (listId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_LIST;
          url = url.replace(':list_id:', listId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single list API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    getNewlySalesForceAccount () {
      return Promise.resolve()
        .then(() => {
          if (newlyAccountID.length) {
            return newlyAccountID;
          } else {
            return this.getValidAccessToken()
              .then(salesforceInfo => {
                const hostName = salesforceInfo.instance_url;
                const url = hostName + ENDPOINTS.CUSTOM_QUERY;
                const dateStart = new Date();
                dateStart.setDate(dateStart.getDate() - DAY_DIFF);
                const requestConfig = {
                  method: 'get',
                  url,
                  headers: {
                    Authorization: salesforceInfo.access_token
                  },
                  params: {
                    q: 'SELECT id, Factoring_Billie_Status__c, LastModifiedDate FROM account ORDER BY LastModifiedDate DESC LIMIT 300'
                  }
                };
                const startTime = Date.now();
                return axios(requestConfig)
                  .then(response => {
                    const newAccounts = response.data.records;
                    newAccounts.forEach(account => {
                      const timeField = new Date(account.LastModifiedDate);
                      if (timeField > dateStart) {
                        newlyAccountID.push(account.Id);
                      }
                    });
                    const endTime = Date.now();
                    this.logger.info('SalesForce newly account API done in: ', endTime - startTime, ' ms');
                    return newlyAccountID;
                  });
              });
          }
        })
        .then(() => {
          if (newlyAccountID && newlyAccountID.length) {
            const accountId = newlyAccountID[0];
            newlyAccountID.splice(0, 1);
            return this.getAccountInfoByID(accountId)
              .then(account => [account]);
          } else {
            return [];
          }
        });
    },

    getAccountInfoByID (accountId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_ACCOUNT;
          url = url.replace(':account_id:', accountId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };
          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single account API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    async getNewlySalesForceOpportunity () {
      if (!newlyOpportunityID || !newlyOpportunityID.length) {
        const salesforceInfo = await this.getValidAccessToken();
        const url = salesforceInfo.instance_url + ENDPOINTS.CUSTOM_QUERY;
        const dateStart = new Date();
        dateStart.setDate(dateStart.getDate() - DAY_DIFF);
        const dateStartStr = dateStart.toISOString();
        const queryByHistory = `SELECT OpportunityId, NewValue, OldValue from OpportunityFieldHistory Where Field='StageName' AND CreatedDate >= ${dateStartStr} ORDER BY CreatedDate DESC LIMIT 500`;
        const queryByOpp = `SELECT Id from Opportunity Where StageName='${SALESFORCE.OPP_STATUS.CLOSED_WON}' AND CreatedDate >= ${dateStartStr} ORDER BY CreatedDate DESC LIMIT 500`;
        const requestConfig = {
          method: 'get',
          url,
          headers: {
            Authorization: salesforceInfo.access_token
          },
          params: {
            q: queryByHistory
          }
        };

        const startTime = Date.now();

        // request by field history
        let response = await axios(requestConfig);
        let newOpps = response.data.records;
        newOpps.forEach(opp => {
          if (opp.NewValue === SALESFORCE.OPP_STATUS.CLOSED_WON ||
            (opp.NewValue === SALESFORCE.OPP_STATUS.CLOSED_LOST &&
              opp.OldValue === SALESFORCE.OPP_STATUS.CLOSED_WON)
          ) {
            newlyOpportunityID.push(opp.OpportunityId);
          }
        });

        // request by opportunity table
        requestConfig.params.q = queryByOpp;
        response = await axios(requestConfig);
        newOpps = response.data.records;
        newOpps.forEach(opp => {
          if (newlyOpportunityID.indexOf(opp.Id) === -1) {
            newlyOpportunityID.push(opp.Id);
          }
        });

        this.logger.debug('REMOVEME - new opp: ', newlyOpportunityID);
        const endTime = Date.now();
        this.logger.info('SalesForce newly opportunity API done in: ', endTime - startTime, ' ms');
      }

      if (newlyOpportunityID && newlyOpportunityID.length) {
        const oppId = newlyOpportunityID[0];
        newlyOpportunityID.splice(0, 1);
        const opportunity = await this.getOpportunityInfoByID(oppId);

        return [opportunity];
      }

      return [];
    },

    async getOpportunityWithEmptyUrl () {
      const salesforceInfo = await this.getValidAccessToken();
      const hostName = salesforceInfo.instance_url;
      const url = hostName + ENDPOINTS.CUSTOM_QUERY;
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: salesforceInfo.access_token
        },
        params: {
          q: 'SELECT id, LastModifiedDate FROM opportunity where StageName = \'Closed Won\' and Universe_URL__c = null ORDER BY LastModifiedDate DESC LIMIT 100'
        }
      };

      const response = await axios(requestConfig);

      return response.data.records;
    },

    getNewlyDeletedOpportunities () {
      return Promise.resolve()
        .then(() => {
          return this.getValidAccessToken()
            .then(salesforceInfo => {
              const hostName = salesforceInfo.instance_url;
              let url = hostName + ENDPOINTS.NEWLY_DELETED_OPP;
              let dateStart = new Date();
              let dateEnd = new Date();
              dateStart.setDate(dateStart.getDate() - 5);
              dateStart = dateStart.toISOString().split('.')[0];
              dateEnd = dateEnd.toISOString().split('.')[0];
              dateStart += '+00:00';
              dateEnd += '+00:00';
              url = url.replace(':start_date:', encodeURIComponent(dateStart));
              url = url.replace(':end_date:', encodeURIComponent(dateEnd));
              const requestConfig = {
                method: 'get',
                url,
                headers: {
                  Authorization: salesforceInfo.access_token
                }
              };
              const startTime = Date.now();
              return axios(requestConfig)
                .then(response => {
                  const endTime = Date.now();
                  this.logger.info('SalesForce newly deleted opportunity API done in: ', endTime - startTime, ' ms');
                  return response.data;
                });
            });
        });
    },

    getOpportunityInfoByID (oppId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_OPP;
          url = url.replace(':opp_id:', oppId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };
          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single opp API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    getCurrencyByID (currencyId) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_CURRENCY;
          url = url.replace(':currency_id:', currencyId);
          const requestConfig = {
            method: 'get',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            }
          };
          const startTime = Date.now();
          return axios(requestConfig)
            .then(response => {
              const endTime = Date.now();
              this.logger.info('SalesForce single currency API done in: ', endTime - startTime, ' ms');
              return response.data;
            });
        });
    },

    getECBUpdateRate () {
      const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
      const requestConfig = {
        method: 'get',
        url
      };
      const startTime = Date.now();
      return axios(requestConfig)
        .then(response => {
          const jsonResponse = x2js.xml2js(response.data);
          const endTime = Date.now();
          this.logger.info('ECB Rate API done in: ', endTime - startTime, ' ms');
          return jsonResponse.Envelope.Cube.Cube.Cube;
        })
        .catch(err => {
          this.logger.error('ECB Rate failed: ', err);
        });
    },

    updateOpportunity (opportunity) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_OPP;
          url = url.replace(':opp_id:', opportunity.id);
          const requestConfig = {
            method: 'patch',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            data: {}
          };
          if (opportunity.revenue) {
            requestConfig.data.amount = opportunity.revenue;
          }
          if (opportunity.send_date) {
            requestConfig.data.Send_date__c = opportunity.send_date;
          }
          if (opportunity.universe_url) {
            requestConfig.data.Universe_URL__c = opportunity.universe_url;
          }
          if (opportunity.campaignId) {
            requestConfig.data.Universe_ID__c = opportunity.campaignId;
          }

          const startTime = Date.now();
          return axios(requestConfig)
            .then(() => {
              const endTime = Date.now();
              this.logger.info('SalesForce update opp ', opportunity.id, ' API done in: ', endTime - startTime, ' ms');
              return this.getOpportunityInfoByID(opportunity.id);
            })
            .catch(err => {
              this.logger.error('Error when update opp ', opportunity.id, ': ', err.response);
              throw err.response;
            });
        });
    },

    updateOpportunityMeasurements (opportunity) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_OPP;
          url = url.replace(':opp_id:', opportunity.id);
          const requestConfig = {
            method: 'patch',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            data: {
              ecpm__c: opportunity.ecpm,
              ocpm__c: opportunity.ocpm,
              rpmo__c: opportunity.rpmo,
              euppc__c: opportunity.euppc
            }
          };

          const startTime = Date.now();
          return axios(requestConfig)
            .then(() => {
              const endTime = Date.now();
              this.logger.info('SalesForce update opp measurement ', opportunity.id, ' API done in: ', endTime - startTime, ' ms');
              return opportunity.id;
            })
            .catch(err => {
              this.logger.error('Error when update opp measurement ', opportunity.id, ': ', err.response);
              const errorMessage = {
                error: err.response.data,
                id: opportunity.id
              };
              throw errorMessage;
            });
        });
    },

    updateCurrencyRate (currency) {
      return this.getValidAccessToken()
        .then(salesforceInfo => {
          const hostName = salesforceInfo.instance_url;
          let url = hostName + ENDPOINTS.SINGLE_CURRENCY;
          url = url.replace(':currency_id:', currency.id);
          const requestConfig = {
            method: 'patch',
            url,
            headers: {
              Authorization: salesforceInfo.access_token
            },
            data: {
              ConversionRate: currency.rate
            }
          };
          const startTime = Date.now();
          return axios(requestConfig)
            .then(() => {
              const endTime = Date.now();
              this.logger.info('SalesForce update currency ', currency.id,
                ' API done in: ', endTime - startTime, ' ms');
              return this.getCurrencyByID(currency.id);
            })
            .catch(err => {
              this.logger.error('Error when update currency ', currency.id, ': ', err);
            });
        });
    },

    async createBulkUpdateJob (object) {
      const salesforceInfo = await this.getValidAccessToken();
      const hostName = salesforceInfo.instance_url;
      const url = hostName + ENDPOINTS.BULK_JOB;
      const requestConfig = {
        method: 'POST',
        url,
        headers: {
          Authorization: salesforceInfo.access_token
        },
        data: {
          object: object,
          externalIdFieldName: 'Universe_ID__c',
          contentType: 'CSV',
          operation: 'upsert',
          lineEnding: 'LF'
        }
      };
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const endTime = Date.now();

      this.logger.info('SalesForce Create Bulk Update Job API done in: ', endTime - startTime, ' ms');

      return response.data;
    },

    async uploadBulkUpdateJob (jobId, filePath) {
      const salesforceInfo = await this.getValidAccessToken();
      const hostName = salesforceInfo.instance_url;
      let url = hostName + ENDPOINTS.UPLOAD_BULK_DATA;

      url = url.replace(':jobId', jobId);

      const requestConfig = {
        method: 'PUT',
        url,
        headers: {
          Authorization: salesforceInfo.access_token,
          'Content-Type': 'text/csv'
        },
        data: fs.readFileSync(filePath),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      };
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const endTime = Date.now();

      this.logger.info('SalesForce Upload Bulk Update API done in: ', endTime - startTime, ' ms');
      fs.unlinkSync(filePath);

      return response.data;
    },

    async closeBulkUpdateJob (jobId) {
      const salesforceInfo = await this.getValidAccessToken();
      const hostName = salesforceInfo.instance_url;
      const url = hostName + ENDPOINTS.BULK_JOB + jobId;
      const requestConfig = {
        method: 'PATCH',
        url,
        headers: {
          Authorization: salesforceInfo.access_token
        },
        data: {
          state: 'UploadComplete'
        }
      };
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const endTime = Date.now();

      this.logger.info('SalesForce Close Bulk Update Job API done in: ', endTime - startTime, ' ms');

      return response.data;
    },

    async getBulkUpdateJob (jobId) {
      const salesforceInfo = await this.getValidAccessToken();
      const hostName = salesforceInfo.instance_url;
      const url = hostName + ENDPOINTS.BULK_JOB + jobId;
      const requestConfig = {
        method: 'GET',
        url,
        headers: {
          Authorization: salesforceInfo.access_token
        }
      };
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const endTime = Date.now();

      this.logger.info('SalesForce Get Bulk Update Job API done in: ', endTime - startTime, ' ms');

      return response.data;
    },

    async getAllUrls (fromDate) {
      const salesforceInfo = await this.getValidAccessToken();
      let query = 'SELECT id, Account__c, Type__c, URL__c, Opportunity__c, LastModifiedDate FROM URL__c';

      if (fromDate) {
        query += ' WHERE LastModifiedDate >= ' + moment(fromDate).toISOString();
      }

      const requestConfig = {
        method: 'GET',
        url: salesforceInfo.instance_url + ENDPOINTS.CUSTOM_QUERY,
        headers: {
          Authorization: salesforceInfo.access_token
        },
        params: {
          q: query
        }
      };
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const endTime = Date.now();
      this.logger.info('SalesForce URLs API done in: ', endTime - startTime, ' ms');

      return response.data.records;
    },

    async getDefaultHeader () {
      const accounts = await this.getExternalSystemAccount();

      return {
        Authorization: `Basic ${accounts[0].token}`
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
