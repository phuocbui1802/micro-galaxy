'use strict';

const axios = require('axios');
const unzip = require('unzip2');
const moment = require('moment');
const cheerio = require('cheerio');

const parsingService = require('../../mixins/parsing.service.js');
const { CLIENT_MESSAGE, USER_IMPORT_STATUS } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_INXMAIL_REPORT: '/api/inxmail/:version:/reports/:mailing_id:/:list_id:',
  ADD_DOMAIN_TO_BLACKLIST: '/api/inxmail/:version:/blacklist/domain',
  ADD_EMAIL_TO_LIST: '/api/inxmail/:version:/email?dob_exists=:dob_exists:&overwrite_data=:overwrite_data:'
};

const axiosInstance = axios.create({
  baseURL: process.env.PHP_CRAWLER_HOST
});

module.exports = {
  name: 'gateway_inxmail',
  mixins: [parsingService],

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
    async handleAddEmailToList (ctx) {
      const status = await this.addEmailToList(ctx.params, ctx.params);

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
      return this.getReportByID(ctx.params.system, ctx.params.id);
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
    getReportByID (system, id) {
      const [mailingId, listId] = id.split('-');
      let url = `${ENDPOINTS.GET_INXMAIL_REPORT}`;
      const version = system.replace('inxmail', '');
      url = url.replace(':mailing_id:', mailingId);
      url = url.replace(':list_id:', listId);
      url = url.replace(':version:', version);
      const requestConfig = {
        method: 'get',
        url,
        responseType: 'stream'
      };
      return axiosInstance(requestConfig)
        .then(response => {
          return new Promise((resolve) => {
            response.data
              .pipe(unzip.Parse())
              .on('entry', entry => {
                const fileName = entry.path;
                entry.setEncoding('utf8');
                let final = '';
                if (fileName === 'report.html') {
                  entry.on('data', buffer => {
                    final += buffer;
                  });
                  entry.on('end', () => {
                    return resolve(this.reportParser(system, id, final));
                  });
                } else {
                  entry.autodrain();
                }
              });
          });
        })
        .catch(err => {
          this.logger.error('Error when getting inxmail file: ', err);
        });
    },
    reportParser (system, id, report) {
      const $ = cheerio.load(report);
      const allInfo = $('.style_12');
      let click, clicker, name, subject, openning, openner, audience, sentMails, sendDate;
      let clickCancel = 0;
      let clickerCancel = 0;
      const category = $('.style_24');
      category.each(function (idx, result) {
        const html = $(result).html();
        if (html.indexOf('Bilder') !== -1) {
          openner = this.numberWithoutSeparator($(category[idx + 1]).text());
          openning = this.numberWithoutSeparator($(category[idx + 2]).text());
          openner = parseInt(openner);
          openning = parseInt(openning);
        }
      });
      allInfo.each(function () {
        const id = $(this).attr('id');
        if (id.indexOf('AUTOGENBOOKMARK_74_') !== -1) {
          const text = this.numberWithoutSeparator($(this).text());
          clicker = parseInt(text);
        }
        if (id.indexOf('AUTOGENBOOKMARK_75_') !== -1) {
          const text = this.numberWithoutSeparator($(this).text());
          click = parseInt(text);
        }
        if (id.indexOf('AUTOGENBOOKMARK_7_') !== -1) {
          name = $(this).text();
        }
        if (id.indexOf('AUTOGENBOOKMARK_9_') !== -1) {
          subject = $(this).text();
        }
        if (id.indexOf('AUTOGENBOOKMARK_11_') !== -1) {
          audience = $(this).text();
        }
        if (id.indexOf('AUTOGENBOOKMARK_20_') !== -1) {
          const text = this.numberWithoutSeparator($(this).text());
          sentMails = parseInt(text);
        }
        if (id.indexOf('AUTOGENBOOKMARK_32_') !== -1) {
          sendDate = this.inxmailDatetimeToServerTime($(this).text());
        }
      });
      const allCancel = $('.style_24');
      let cancelIdx = null;
      allCancel.each(function (idx) {
        if ($(this).text() === 'Cancel subscription') {
          cancelIdx = idx;
        }
        if (cancelIdx && idx === cancelIdx + 1) {
          const text = this.numberWithoutSeparator($(this).text());
          if (!isNaN(text)) {
            clickerCancel += parseInt(text);
          }
        }
        if (cancelIdx && idx === cancelIdx + 3) {
          const text = this.numberWithoutSeparator($(this).text());
          if (!isNaN(text)) {
            clickCancel += parseInt(text);
          }
        }
      });
      click -= clickCancel;
      clicker -= clickerCancel;
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.id = id;
      fullReturnData.system = system;
      fullReturnData.total = 1;
      fullReturnData.reports = [{
        click,
        clicker,
        openning,
        openner,
        name,
        subject,
        audience,
        unsubscribe: clickCancel,
        sent_mails: sentMails,
        send_date: sendDate
      }];
      return fullReturnData;
    },

    async addEmailToList (body, query) {
      const { version, overwrite_data: overwriteData, list_id: listId } = query;
      let url = ENDPOINTS.ADD_EMAIL_TO_LIST;
      url = url.replace(':version:', version);
      url = url.replace(':overwrite_data:', overwriteData.toString());

      if (body.dob) {
        url = url.replace(':dob_exists:', 'true');
        body.dob = moment(body.dob, 'YYYY-MM-DD').format('YYYY-MM-DDT00:00:00.000Z');
      } else {
        url = url.replace(':dob_exists:', 'false');
        body.dob = '';
      }

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
        body.gender = 'Herr';
      } else if (body.gender.toLowerCase() === 'f') {
        body.gender = 'Frau';
      }

      const jsonData = {
        list_name: listId,
        emails: [{
          email: body.email,
          dob: body.dob,
          supplier: body.supplier,
          city: body.city,
          country: body.country,
          first_name: body.first_name,
          last_name: body.last_name,
          gender: body.gender,
          region: body.region,
          zip: body.zip,
          galaxy_id: body.galaxy_id,
          md5: body.md5,
          geoip_city: body.geoip_city,
          geoip_country: body.geoip_country,
          geoip_zip: body.geoip_zip,
          geoip_state: body.geoip_state
        }]
      };

      try {
        await axiosInstance.post(
          url,
          jsonData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        return USER_IMPORT_STATUS.USABLE;
      } catch (e) {
        this.logger.error(e);
        return USER_IMPORT_STATUS.FAILED;
      }
    },

    addDomainToBlacklist (domain, version) {
      let url = ENDPOINTS.ADD_DOMAIN_TO_BLACKLIST.replace(':version:', version);
      return axiosInstance.post(url, { domain: `*@${domain}` })
        .then(res => {
          return res.data;
        })
        .catch(err => {
          this.logger.error(err);
          return err;
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
