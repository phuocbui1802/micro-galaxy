'use strict';

const qs = require('qs');
const X2JS = require('x2js/x2js.js');
const x2js = new X2JS();
const request = require('request-promise');

const ENDPOINTS = {
  DONE_ID: '/mailings/filter/states',
  OPENS: '/reports/opens/count',
  OPENS_UNIQUE: '/reports/opens/unique/count',
  CLICKS: '/reports/clicks/count',
  CLICKS_UNIQUE: '/reports/clicks/unique/count',
  RECIPIENTS: '/reports/recipients/count',
  SUBJECT: '/mailings/:mailing_id:/contents/subject',
  SENDER: '/mailings/:mailing_id:/contents/senderalias'
};

const MAILEON_LIST = [{
  DONE: [],
  NAME: 'evania AU',
  TOKEN: 'Basic OGQ1MzgyMDItOTRjOC00MDk0LWEyNTctYTBhMDQyYWEwYmVi'
}, {
  DONE: [],
  NAME: 'evania ASIA',
  TOKEN: 'Basic N2FhMjdmMmUtYjRhOC00YzE4LThhNzYtMTllMDFhYjdjY2Vk'
}, {
  DONE: [],
  NAME: 'evania ES',
  TOKEN: 'Basic NTI0NjAwN2QtNDhiZi00NGNkLTk4OGQtYWIzNDhjYzdkNzBk'
}, {
  DONE: [],
  NAME: 'evania DE',
  TOKEN: 'Basic Y2VlN2EzYjEtOWJmNC00NThkLWEwNmItNmMzZGE2MjQ0M2Jh'
}, {
  DONE: [],
  NAME: 'evania PL',
  TOKEN: 'Basic NjcxYmY5ZjgtY2JhNy00YjQzLTgxNDUtYjQ4ODdmZjc0Yzg5'
}, {
  DONE: [],
  NAME: 'evania DE 2',
  TOKEN: 'Basic ZTg4NWY0NTUtMjY5NS00NTU0LTkxNWEtYmZjODhlZDUzYTVi'
}];
let currentListIdx = 0;

module.exports = {
  name: 'gateway_maileon',
  mixins: [],

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
    async handleGetNewMailingFromXQueue (ctx) {
      const response = await this.getNewMailing();

      return ({
        message: 'OK',
        response: response
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

    getDoneID (listIdx) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.DONE_ID}`;
      const params = {
        states: 'done',
        fields: ['name', 'scheduleTime'],
        orderBy: 'schedule_time',
        order: 'desc',
        page_size: '1000'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN,
          'User-Agent': 'Request-Promise'
        }
      };
      return request(requestConfig)
        .then(response => {
          const jsonResponse = x2js.xml2js(response);
          const totalLength = jsonResponse.mailings.mailing.length;
          const mailingArray = totalLength ? jsonResponse.mailings.mailing
            : [jsonResponse.mailings.mailing];
          mailingArray.forEach(singleMailing => {
            const mailingInfo = {};
            mailingInfo.id = singleMailing.id;
            singleMailing.fields.field.forEach(singleField => {
              mailingInfo[singleField.name] = singleField.value;
            });
            mailingInfo.send_date = mailingInfo.scheduleTime;
            if (totalLength > 100) { // cut off to 10 days if too much
              const earliestDate = new Date();
              const sendDate = new Date(mailingInfo.send_date);
              earliestDate.setDate(earliestDate.getDate() - 10);
              if (earliestDate <= sendDate) {
                MAILEON_LIST[listIdx].DONE.push(mailingInfo);
              }
            } else {
              MAILEON_LIST[listIdx].DONE.push(mailingInfo);
            }
          });
          this.logger.debug('REMOVEME - done list: ', listIdx, ': ', MAILEON_LIST[listIdx].DONE);
          return response;
        })
        .catch(err => {
          this.logger.error('Error: ', err);
        });
    },

    getOpens (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.OPENS}`;
      const params = {
        mailing_id: mailingId,
        exclude_anonymous_opens: 'false'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .then(response => {
          return response;
        })
        .catch(err => {
          this.logger.error('Error when getting opens of ', mailingId, ': ', err.response);
        });
    },

    getOpensUnique (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.OPENS_UNIQUE}`;
      const params = {
        mailing_id: mailingId,
        exclude_anonymous_opens: 'false'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting opens unique of ', mailingId, ': ', err.response);
        });
    },

    getClicks (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.CLICKS}`;
      const params = {
        mailing_id: mailingId,
        exclude_anonymous_opens: 'false'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting clicks of ', mailingId, ': ', err.response);
        });
    },

    getClicksUnique (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.CLICKS_UNIQUE}`;
      const params = {
        mailing_id: mailingId,
        exclude_anonymous_opens: 'false'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting clicks unique of ', mailingId, ': ', err.response);
        });
    },

    getRecipients (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.RECIPIENTS}`;
      const params = {
        mailing_id: mailingId,
        exclude_anonymous_opens: 'false'
      };
      url = url + '?' + qs.stringify(params, { arrayFormat: 'repeat' });
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting recipients of ', mailingId, ': ', err.response);
        });
    },

    getSubject (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.SUBJECT}`;
      url = url.replace(':mailing_id:', mailingId);
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting subject of ', mailingId, ' : ', err.response);
        });
    },

    getSender (listIdx, mailingId) {
      let url = `${process.env.MAILEON_HOST}${ENDPOINTS.SENDER}`;
      url = url.replace(':mailing_id:', mailingId);
      const requestConfig = {
        method: 'get',
        url,
        headers: {
          Authorization: MAILEON_LIST[listIdx].TOKEN
        }
      };
      return request(requestConfig)
        .catch(err => {
          this.logger.error('Error when getting sender of ', mailingId, ' : ', err.response);
        });
    },

    getMailingDetails (listIdx, mailingId) {
      return Promise.all([
        this.getOpens(listIdx, mailingId),
        this.getOpensUnique(listIdx, mailingId),
        this.getClicks(listIdx, mailingId),
        this.getClicksUnique(listIdx, mailingId),
        this.getRecipients(listIdx, mailingId),
        this.getSubject(listIdx, mailingId),
        this.getSender(listIdx, mailingId)
      ])
        .then(([opens, opensUnique, clicks, clicksUnique, recipients, subject, sender]) => {
          const opensJson = x2js.xml2js(opens);
          const opensUniqueJson = x2js.xml2js(opensUnique);
          const clicksJson = x2js.xml2js(clicks);
          const clicksUniqueJson = x2js.xml2js(clicksUnique);
          const recipientsJson = x2js.xml2js(recipients);
          const subjectJson = x2js.xml2js(subject);
          const senderJson = x2js.xml2js(sender);
          return {
            id: mailingId,
            opens: opensJson.count,
            opens_unique: opensUniqueJson.count,
            clicks: clicksJson.count,
            clicks_unique: clicksUniqueJson.count,
            recipients: recipientsJson.count,
            subject: subjectJson.subject,
            sender: senderJson.senderalias
          };
        });
    },

    getDoneList () {
      if (MAILEON_LIST[currentListIdx].DONE.length) {
        return Promise.resolve(currentListIdx);
      } else {
        currentListIdx += 1;
        currentListIdx = currentListIdx % MAILEON_LIST.length;
        return this.getDoneID(currentListIdx)
          .then(() => currentListIdx);
      }
    },

    getNewMailing () {
      return this.getDoneList()
        .then(nextList => {
          const nextMailing = MAILEON_LIST[nextList].DONE.splice(0, 1);
          return this.getMailingDetails(nextList, nextMailing[0].id)
            .then(sendout => {
              sendout = Object.assign(sendout, nextMailing[0]);
              return sendout;
            });
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
