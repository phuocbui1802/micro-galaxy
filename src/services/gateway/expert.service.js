'use strict';

const axios = require('axios');
const fs = require('fs');
const X2JS = require('x2js');
const x2js = new X2JS();
const moment = require('moment');
const xmlBuilder = require('xmlbuilder');
const SSHClient = require('ssh2').Client;

const credentialsService = require('../../mixins/credentials.service.js');
const fileService = require('../../mixins/file.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const BadRequestError = require('../../utils/exception/bad_request_error.js');
const { CLIENT_MESSAGE, USER_IMPORT_STATUS } = require('../../utils/constants.js');

const ENDPOINTS = {
  LAST_NEWSLETTER: 'Messages',
  SINGLE_MESSAGE: 'Messages/:message_id:',
  SINGLE_MESSAGE_STAT: 'MessageStatistics/:message_id:',
  SINGLE_EMAIL: 'Subscribers',
  WORKFLOW_MESSAGES: 'Messages?startDate=:start_date:&endDate=:end_date:&type=:type:',
  WORKFLOW_MESSAGES_STAT: 'MessageStatistics/:message_id:?startDate=:start_date:&endDate=:end_date:&type=:type:&apiKey=:apiKey:',
  GET_ALL_LISTS: 'Lists'
};

const NON_EXIST_API_RESPONSE = 'Resource with specified ID not found.';
const WORKFLOW_END_DATE = moment().format('YYYY-MM-DD');
const WORKFLOW_START_DATE = moment(WORKFLOW_END_DATE, 'YYYY-MM-DD').subtract(30, 'days').format('YYYY-MM-DD');

const SSHConnection = new SSHClient();
let SFTPConnection = null;

const FILE_NAME = {
  REMOTE: '/uploads/blacklist_ExpertSender.csv',
  BLACKLIST: 'blacklist.csv',
  NEW_BLACKLIST: 'new_blacklist.csv'
};

module.exports = {
  name: 'gateway_expert',
  mixins: [fileService, credentialsService, formattingService],

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
      const info = await this.getMessageStat(ctx.params.message_id, ctx.params);
      return {
        message: 'OK',
        info
      };
    },

    async handleBlacklistEmailAddress (ctx) {
      const status = await this.blacklistEmail(ctx.params.email_address);

      return {
        message: 'OK',
        status
      };
    },

    async handleUnSubEmailAddress (ctx) {
      const status = await this.unSubEmail(ctx.params.email_address);

      return {
        message: 'OK',
        status
      };
    },

    handleGetWorkflowMessage (ctx) {
      return this.getWorkflowMessages(ctx.params.unit);
    },

    /*
      async handleUpdateExpertSenderConfig (ctx) {
        const response = await this.updateConfigFromDB();
        return {
          message: 'OK',
          units: response
        };
      },
    */

    async handleGetAllLists (ctx) {
      const response = await this.getAllLists(ctx.params.unit);

      return {
        total: response.length,
        message: 'OK',
        system: 'ExpertSender_' + ctx.params.unit,
        lists: response
      };
    },

    async handleAddEmailToList (ctx) {
      const response = await this.addEmailToList(ctx.params.unit, ctx.params.list_id, ctx.params);
      return {
        message: 'OK',
        email: ctx.params.email,
        list_id: ctx.params.list_id,
        list_name: ctx.params.list_name,
        system: ctx.params.system,
        country: ctx.params.country,
        status: response.status
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
    async getConfigFromDatabase (unit) {
      try {
        const removeUUnit = unit.replace('U', '');
        const configName = ('expertsender_' + removeUUnit.toString()).toLowerCase();
        return await this.getConfigByName(configName);
      } catch (e) {
        this.logger.error('Error getConfigFromDatabase: ', e);
      }
    },

    async getUnitListFromDatabase () {
      const configName = 'expert_sender_units';
      const response = await this.getConfigByName(configName);
      if (response) {
        return response.json_config.lists;
      } else {
        return [];
      }
    },

    async getAllNewsletter (options) {
      const unit = options.unit ? options.unit : 'U0';
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      let requestConfig = {};
      try {
        const messageType = options.type ? options.type : jsonConfig.DEFAULT_TYPE;
        const dateDiff = options.diff ? options.diff : jsonConfig.DEFAULT_DAY_DURATION;
        const url = jsonConfig.BASE_URL + ENDPOINTS.LAST_NEWSLETTER;
        const twoDaysBefore = new Date();
        twoDaysBefore.setDate(twoDaysBefore.getDate() - dateDiff);
        requestConfig = {
          url,
          method: 'GET',
          params: {
            apiKey: jsonConfig.API_KEY,
            startDate: this.getValidDateString(twoDaysBefore),
            type: messageType
          }
        };
      } catch (ex) {
        this.logger.error('ex: ', unit, ' - ', ex);
      }
      try {
        const response = await axios(requestConfig);
        const jsonData = x2js.xml2js(response.data);
        try {
          const messages = jsonData.ApiResponse.Data.Messages.Message;
          return messages || [];
        } catch (ex) {
          throw new BadRequestError('Wrong structure of response (ApiResponse, Data, Messages, Message)');
        }
        // return jsonData.ApiResponse.Data.Messages;
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

    async getMessageStat (messageId, options = {}) {
      const unit = options.unit ? options.unit : 'U0';
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);

      let overallUrl = jsonConfig.BASE_URL + ENDPOINTS.SINGLE_MESSAGE;
      let StatUrl = jsonConfig.BASE_URL + ENDPOINTS.SINGLE_MESSAGE_STAT;
      StatUrl = StatUrl.replace(':message_id:', messageId);
      overallUrl = overallUrl.replace(':message_id:', messageId);
      const overallRequestConfig = {
        url: overallUrl,
        method: 'GET',
        params: {
          apiKey: jsonConfig.API_KEY
        }
      };
      const statRequestConfig = {
        url: StatUrl,
        method: 'GET',
        params: {
          apiKey: jsonConfig.API_KEY
        }
      };
      try {
        const [overallResponse, statResponse] = [
          await axios(overallRequestConfig),
          await axios(statRequestConfig)
        ];
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

    getMessageStatByID (system, messageId) {
      const unit = 'U' + system.replace('expert_u', '');
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = system;
      fullReturnData.id = messageId;
      return this.getConfigFromDatabase(unit)
        .then(({ json_config: jsonConfig }) => {
          let overallUrl = jsonConfig.BASE_URL + ENDPOINTS.SINGLE_MESSAGE;
          let StatUrl = jsonConfig.BASE_URL + ENDPOINTS.SINGLE_MESSAGE_STAT;
          const apiKey = jsonConfig.API_KEY;
          StatUrl = StatUrl.replace(':message_id:', messageId);
          overallUrl = overallUrl.replace(':message_id:', messageId);
          const overallRequestConfig = {
            url: overallUrl,
            method: 'GET',
            params: {
              apiKey: apiKey
            },
            headers: {
              Connection: 'keep-alive'
            }
          };
          const statRequestConfig = {
            url: StatUrl,
            method: 'GET',
            params: {
              apiKey: apiKey
            },
            headers: {
              Connection: 'keep-alive'
            }
          };
          return Promise.all([axios(overallRequestConfig), axios(statRequestConfig)])
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
              const errorMessage = x2js.xml2js(ex.response.data).ApiResponse.ErrorMessage.Message;
              if (errorMessage.localeCompare(NON_EXIST_API_RESPONSE) === 0) {
                fullReturnData.total = 0;
                fullReturnData.reports = [{
                  client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
                }];
                return fullReturnData;
              } else {
                this.logger.error(errorMessage);
                throw errorMessage;
              }
            });
        });
    },

    blacklistEmail (emailAddress) {
      return this.downloadBlacklistFile()
        .then(() => {
          this.logger.info('Downloaded blacklist file');
          return this.addedEmailToFile(FILE_NAME.BLACKLIST, emailAddress, FILE_NAME.NEW_BLACKLIST);
        })
        .then(() => this.uploadNewBlacklistFile())
        .then(() => {
          this.logger.info('New blacklist file uploaded');
          fs.unlinkSync(FILE_NAME.BLACKLIST);
          fs.unlinkSync(FILE_NAME.NEW_BLACKLIST);
        });
    },

    unSubEmail (emailAddress) {
      return this.getUnitListFromDatabase()
        .then(allUnits => {
          const doneUnits = [];
          return Promise.all(allUnits.map(unit => {
            return this.getConfigFromDatabase(unit)
              .then(({ json_config: jsonConfig }) => {
                const url = jsonConfig.BASE_URL + ENDPOINTS.SINGLE_EMAIL;
                const requestConfig = {
                  url,
                  method: 'DELETE',
                  params: {
                    apiKey: jsonConfig.API_KEY,
                    email: emailAddress
                  }
                };
                return axios(requestConfig)
                  .then(() => {
                    doneUnits.push(unit);
                  })
                  .catch(ex => {
                    const jsonData = x2js.xml2js(ex.response.data);
                    let errorMessage = '';
                    try {
                      errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
                    } catch (ex) {
                      errorMessage = 'Unknown error message';
                    }
                    if (errorMessage.indexOf('not found') !== -1) {
                      doneUnits.push(unit);
                    }
                    this.logger.error(`Unit ${unit} is having error ${errorMessage}`);
                  });
              });
          }))
            .then(() => {
              return doneUnits;
            });
        });
    },

    async addEmailToList (unit, ListId, body) {
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      const url = jsonConfig.BASE_URL + 'Subscribers';
      const apiKey = jsonConfig.API_KEY;
      const idMapping = jsonConfig.ID_MAPPING;

      if (body.dob) {
        body.dob = moment(body.dob, 'YYYY-MM-DD').format('YYYY-MM-DD');
      } else {
        delete body.dob;
      }
      const otherFields = ['city', 'country', 'first_name', 'last_name', 'gender', 'region', 'zip', 'soi_ip'];
      otherFields.forEach(field => {
        if (!body[field]) {
          delete body[field];
        }
      });

      const xmlString = xmlBuilder.begin().ele('ApiRequest', {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xs': 'http://www.w3.org/2001/XMLSchema'
      })
        .ele('ApiKey', apiKey).up()
        .ele('VerboseErrors', true).up()
        .ele('ReturnData', true).up()
        .ele('Data', { 'xsi:type': 'Subscriber' })
        .ele('Mode', 'AddAndUpdate').up()
        .ele('ListId', ListId).up()
        .ele('Email', body.email).up()
        .ele('Vendor', body.supplier).up()
        .ele('Ip', body.soi_ip).up()
        .ele('Firstname', this.capitaliseFirstChar(body.first_name)).up()
        .ele('Lastname', this.capitaliseFirstChar(body.last_name)).up()
        .ele('Properties')
        .ele('Property')
        .ele('Id', idMapping.country).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.country).up().up()
        .ele('Property')
        .ele('Id', idMapping.city).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.city).up().up()
        .ele('Property')
        .ele('Id', idMapping.region).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.region).up().up()
        .ele('Property')
        .ele('Id', idMapping.dob).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.dob).up().up()
        .ele('Property')
        .ele('Id', idMapping.gender).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.gender).up().up()
        .ele('Property')
        .ele('Id', idMapping.galaxy_id).up()
        .ele('Value', { 'xsi:type': 'xs:string' }, body.galaxy_id).up().up()
        .end({ pretty: true });

      const requestConfig = {
        method: 'POST',
        url: url,
        data: xmlString,
        headers: { 'Content-Type': 'text/xml' }
      };
      const promise = new Promise((resolve, reject) => {
        return axios(requestConfig)
          .then(res => {
            return resolve({
              status: x2js.xml2js(res.data).ApiResponse.Data.SubscriberData.WasAdded === 'true'
                ? USER_IMPORT_STATUS.USABLE
                : USER_IMPORT_STATUS.DUPLICATED
            });
          })
          .catch(err => {
            const errorMessage = x2js.xml2js(err.response.data).ApiResponse.ErrorMessage.Messages.Message.__text;

            if (errorMessage && errorMessage.includes('blacklist')) {
              return resolve({
                status: USER_IMPORT_STATUS.BLACKLISTED
              });
            } else {
              return reject(err);
            }
          });
      });
      return promise
        .then(response => {
          return ({
            message: 'OK',
            email: body.email,
            list_id: ListId,
            list_name: body.list_name,
            system: `ExpertSender_${unit}`,
            country: body.country,
            status: response.status
          });
        })
        .catch(ex => {
          const jsonData = x2js.xml2js(ex.response.data);

          throw JSON.stringify(jsonData.ApiResponse.ErrorMessage);
        });
    },

    getWorkflowMessages (unit) {
      const system = 'ExpertSender_' + unit.slice(1) + '_WM';
      return this.getConfigFromDatabase(unit)
        .then(({ json_config: jsonConfig }) => {
          let overallUrl = jsonConfig.BASE_URL + ENDPOINTS.WORKFLOW_MESSAGES;
          const apiKey = jsonConfig.API_KEY;
          overallUrl = overallUrl.replace(':start_date:', WORKFLOW_START_DATE);
          overallUrl = overallUrl.replace(':end_date:', WORKFLOW_END_DATE);
          overallUrl = overallUrl.replace(':type:', 'WorkflowMessage');
          const overallRequestConfig = {
            url: overallUrl,
            method: 'GET',
            params: {
              apiKey: apiKey
            },
            headers: {
              Connection: 'keep-alive'
            }
          };
          return axios(overallRequestConfig)
            .then((overallResponse) => {
              if (x2js.xml2js(overallResponse.data).ApiResponse.Data.Messages === '') {
                return {
                  message: 'OK',
                  system: system,
                  total: 0,
                  reports: [{
                    client_message: 'No workflow message'
                  }]
                };
              }
              const jsonOverall = x2js.xml2js(overallResponse.data).ApiResponse.Data.Messages.Message;
              try {
                const returnData = [];
                const statUrlArray = [];
                jsonOverall.forEach(message => {
                  let statUrl = jsonConfig.BASE_URL + ENDPOINTS.WORKFLOW_MESSAGES_STAT;
                  statUrl = statUrl.replace(':start_date:', WORKFLOW_START_DATE);
                  statUrl = statUrl.replace(':end_date:', WORKFLOW_END_DATE);
                  statUrl = statUrl.replace(':apiKey:', apiKey);
                  statUrl = statUrl.replace(':message_id:', message.Id);
                  statUrl = statUrl.replace(':type:', 'WorkflowMessage');
                  statUrlArray.push(statUrl);
                });
                return new Promise(function (resolve) {
                  axios.all(statUrlArray.map(link => axios.get(link)))
                    .then(function (results) {
                      for (let i = 0; i < results.length; i++) {
                        returnData.push({
                          stat: x2js.xml2js(results[i].data).ApiResponse.Data,
                          overall: jsonOverall[i]
                        });
                      }
                      return resolve({
                        message: 'OK',
                        system: system,
                        total: returnData.length,
                        reports: returnData
                      });
                    });
                })
                  .catch(e => this.logger.error(e));
              } catch (ex) {
                throw new BadRequestError('Wrong structure of response (ApiResponse, Data, Messages, Message)');
              }
            })
            .catch(ex => {
              if (x2js.xml2js(ex.response)) {
                const jsonData = x2js.xml2js(ex.response.data);
                let errorMessage = '';
                let newError = '';
                try {
                  errorMessage = jsonData.ApiResponse.ErrorMessage.Message;
                } catch (ex) {
                  errorMessage = 'Unknown error message';
                }
                if (errorMessage.localeCompare(NON_EXIST_API_RESPONSE) === 0) {
                  newError = {
                    total: 0,
                    reports: [{
                      client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
                    }]
                  };
                } else {
                  newError = {
                    client_message: errorMessage
                  };
                }
                throw newError;
              }
            });
        });
    },

    async getAllLists (unit) {
      const { json_config: JsonConfig } = await this.getConfigFromDatabase(unit);
      let listsUrl = JsonConfig.BASE_URL + ENDPOINTS.GET_ALL_LISTS;
      const apiKey = JsonConfig.API_KEY;
      listsUrl = listsUrl.replace(':start_date:', WORKFLOW_START_DATE);
      listsUrl = listsUrl.replace(':end_date:', WORKFLOW_END_DATE);
      listsUrl = listsUrl.replace(':type:', 'WorkflowMessage');
      const getListsConfig = {
        url: listsUrl,
        method: 'GET',
        params: {
          apiKey: apiKey
        },
        headers: {
          Connection: 'keep-alive'
        }
      };
      try {
        const lists = await axios(getListsConfig);
        let jsonData = x2js.xml2js(lists.data).ApiResponse.Data.Lists.List;
        if (!Array.isArray(jsonData)) jsonData = [jsonData];
        return jsonData.map(list => {
          return {
            id: list.Id,
            name: list.Name
          };
        });
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

    downloadBlacklistFile () {
      return new Promise((resolve) => {
        const rstream = SFTPConnection.createReadStream(FILE_NAME.REMOTE);
        const wstream = fs.createWriteStream(FILE_NAME.BLACKLIST);
        rstream.pipe(wstream);
        rstream.on('error', function (err) { // To handle remote file issues
          this.logger.error(err.message);
          rstream.destroy();
          wstream.destroy();
        });
        wstream.on('finish', function () {
          resolve('DONE');
        });
      });
    },

    uploadNewBlacklistFile () {
      return new Promise((resolve) => {
        const wstream = SFTPConnection.createWriteStream(FILE_NAME.REMOTE);
        const rstream = fs.createReadStream(FILE_NAME.NEW_BLACKLIST);
        rstream.pipe(wstream);
        rstream.on('error', function (err) { // To handle remote file issues
          this.logger.error(err.message);
          rstream.destroy();
          wstream.destroy();
        });
        wstream.on('finish', function () {
          resolve('DONE');
        });
      });
    }
  },

  /**
   * Service created lifecycle event handler
   */
  created () {
    SSHConnection.on('ready', function () {
      SSHConnection.sftp((err, sftp) => {
        if (err) {
          this.logger.error('Can\'t create sftp connection');
        } else {
          SFTPConnection = sftp;
        }
      });
    });

    SSHConnection.connect({
      host: 'sftp.audienceserv.com',
      username: 'as',
      password: 'j2S5R2bxPA'
    });
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
