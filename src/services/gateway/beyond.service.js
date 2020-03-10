'use strict';

const axios = require('axios');
const moment = require('moment');
const puppeteer = require('puppeteer');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const formattingService = require('../../mixins/formatting.service.js');

const { SYSTEMS, USER_IMPORT_STATUS, GENDER, CLIENT_MESSAGE } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_SESSION_ID: '/brmapi/login',
  GET_DATASOURCE: '/brmapi/getdatasources',
  GET_REPORT: '/brmapi/getreport',
  GET_MESSAGES: '/brmapi/getmessages',
  GET_MESSAGE: '/brmapi/getmessage',
  ADD_MESSAGE: '/brmapi/modcreatemessage',
  GET_CAMPAIGN: '/brmapi/getcampaign',
  ADD_CAMPAIGN: '/brmapi/modcreatecampaign',
  ACTIVE_CAMPAIGN: '/brmapi/activatecampaign',
  ADD_BLACKLIST: '/brmapi/addtoblacklist',
  DELETE_BLACKLIST: '/brmapi/deletefromblacklist',
  GET_USER: '/brmapi/getrecipients',
  ADD_SINGLE_EMAIL: '/brmapi/modcreaterecipients',
  GET_DOMAINS: '/brmapi/getdomains',
  GET_SEGMENTS: '/brmapi/getselectioncriterias'
};

const WEB_ENDPOINTS = {
  HOME: 'https://em6.beyondrm.com/',
  SELECT_SOURCE: 'https://em6.beyondrm.com/top',
  ADD_MESSAGE: 'https://em6.beyondrm.com/newmessage',
  EDIT_MESSAGE: 'https://em6.beyondrm.com/editmessage?message_id=',
  ADD_CAMPAIGN: 'https://em6.beyondrm.com/createCampaign?message_id=',
  GET_CAMPAIGNS: 'https://em6.beyondrm.com/campaigns',
  EDIT_CAMPAIGN: 'https://em6.beyondrm.com/editcampaign2?campagne_id=',
  ACTIVE_CAMPAIGN: 'https://em6.beyondrm.com/sendcampaign?campagne_id=',
  SEND_TEST_CAMPAIGN: 'https://em6.beyondrm.com/textboxtest?campagne_id='
};

const STATUS = {
  OK: 'OK',
  ERROR: 'ERR'
};

let browser;

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
      const response = await this.getUserByEmail(ctx.params.email_address, unit);

      return {
        total: response.data.recipients.length,
        message: STATUS.OK,
        recipients: response.data.recipients
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
    },

    handleCreateCampaign (ctx) {
      return this.sendBeyondCampaign(
        ctx.params.unit,
        ctx.params.name,
        ctx.params.subject,
        ctx.params.senderName,
        ctx.params.contentHtml,
        ctx.params.contentText,
        ctx.params.sourceId,
        ctx.params.domainId,
        ctx.params.sendDate,
        ctx.params.segmentId,
        ctx.params.volume,
        ctx.params.testEmail
      );
    },

    handleUpdateCampaign (ctx) {
      return this.processCampaignUpdate(
        ctx.params.id,
        ctx.params.unit,
        ctx.params.name,
        ctx.params.subject,
        ctx.params.senderName,
        ctx.params.contentHtml,
        ctx.params.contentText,
        ctx.params.sourceId,
        ctx.params.domainId,
        ctx.params.sendDate,
        ctx.params.segmentId,
        ctx.params.volume,
        ctx.params.testEmail
      );
    },

    async handleGetDomains (ctx) {
      return {
        status: STATUS.OK,
        domains: await this.getBeyondDomains(ctx.params.unit)
      };
    },

    async handleGetSegments (ctx) {
      return {
        status: STATUS.OK,
        segments: await this.getBeyondSegments(ctx.params.unit, ctx.params.sourceId)
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

    async getUserByEmail (email, unit) {
      this.logger.info('Getting: ', email, ' from beyond');
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.GET_USER}`;
      const sessionId = await this.getValidBeyondCredential(unit);

      return axios({
        method: 'post',
        url: url,
        data: {
          session_id: sessionId,
          emails: [email]
        }
      });
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
      const url = `${process.env.BEYOND_HOST}${ENDPOINTS.ADD_SINGLE_EMAIL}`;

      const { data } = await axios({
        method: 'POST',
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_DATASOURCE}`,
        data: {
          session_id: sessionId
        }
      });

      const errors = [];

      for (const source of data.datasources) {
        try {
          const dateUnJoin = moment().format('YYYY-MM-DD HH:mm:ss');
          const { data } = await axios({
            method: 'POST',
            url,
            data: {
              session_id: sessionId,
              recipients: [{ email, dateunjoin: dateUnJoin }],
              source_id: source.source_id,
              return_ids: 1
            }
          });
          if (data.status === STATUS.ERROR) {
            data.sourceId = source.source_id;
            errors.push(data);
          }
        } catch (e) {
          this.logger.error('Error unsubscribeEmail: ', e);
          errors.push({
            status: 'ERR',
            msg: e.message,
            sourceId: source.source_id
          });
        }
      }

      return errors;
    },

    async createBeyondCampaign (
      page,
      name,
      startDate,
      messageId,
      domainId,
      segmentId,
      volume
    ) {
      await page.goto(WEB_ENDPOINTS.ADD_CAMPAIGN + messageId);
      // await page.waitForNavigation();

      await page.goto(WEB_ENDPOINTS.GET_CAMPAIGNS);
      await page.waitForSelector('#campagnetable');
      const rows = await page.$$('#campagnetable > tbody > tr');
      // test_camp is displayed as test_ camp
      const cells = await this.findCellsByCellValue(page, rows, 2, name.replace(/_/g, '_ '));
      if (!cells.length) {
        throw new Error('Could not find campaign by name');
      }
      const campaignId = await page.evaluate(el => el.textContent.trim(), cells[0]);
      await this.updateCampaign(page, campaignId, startDate, domainId, segmentId, volume);

      return campaignId;
    },

    async updateCampaign (page, campaignId, startDate, domainId, segmentId, volume) {
      const dateObj = moment(startDate);

      await page.goto(WEB_ENDPOINTS.EDIT_CAMPAIGN + campaignId);
      await page.waitForSelector('#campagne_name');
      const messageId = await page.$eval('#message_id', el => el.value);

      // await page.type('#campagne_name', name);
      await page.select('#domain_id', domainId);
      // await page.type('#textbox', segmentId, {delay: 50});
      await page.select('#select', segmentId);
      await page.select('select[name="tag"]', dateObj.format('DD'));
      await page.select('select[name="monat"]', dateObj.format('MM'));
      await page.select('select[name="jahr"]', dateObj.format('YYYY'));
      await page.select('select[name="stunde"]', dateObj.format('HH'));
      await page.select('select[name="minute"]', dateObj.format('mm'));
      await page.$eval('#rowlimit', el => { el.value = ''; });
      await page.type('#rowlimit', volume.toString());
      await page.click('input[type="button"]');
      await page.waitForSelector('#campagnetable');

      return messageId;
    },

    async selectDataSource (page, sourceId) {
      await page.goto(WEB_ENDPOINTS.SELECT_SOURCE);
      await page.waitForSelector(`#member_table_select`);
      await page.select('#member_table_select', sourceId);

      await page.waitForSelector('#member_table_select');
    },

    async sendTestMail (page, email, campaignId) {
      await page.goto(WEB_ENDPOINTS.SEND_TEST_CAMPAIGN + campaignId);
      await page.waitForSelector('textarea[name="addresses"]');
      await page.type('textarea[name="addresses"]', email);
      await page.click('input[name="sendbutton"]');
    },

    async createBeyondMessage (page, msgName, subject, senderName, contentHtml, contentText) {
      await page.goto(WEB_ENDPOINTS.ADD_MESSAGE);

      await this.fillMessageForm(page, subject, senderName, contentHtml, contentText, msgName);
      const messages = await page.$$('#messagetable tr');

      const cells = await this.findCellsByCellValue(page, messages, 2, msgName);
      if (cells.length) {
        return page.evaluate(el => el.textContent.trim(), cells[0]);
      }

      throw new Error('Message not found');
    },

    async updateBeyondMessage (page, messageId, subject, senderName, contentHtml, contentText) {
      await page.goto(WEB_ENDPOINTS.EDIT_MESSAGE + messageId);
      await this.fillMessageForm(page, subject, senderName, contentHtml, contentText);
    },

    async fillMessageForm (page, subject, senderName, contentHtml, contentText, msgName = '') {
      await page.waitForSelector('#message_name');
      await page.type('#message_name', msgName);
      await page.$eval('#message_from', el => { el.value = ''; });
      await page.type('#message_from', senderName);
      await page.$eval('#message_subject', el => { el.value = ''; });
      await page.type('#message_subject', subject);
      await page.$eval('#body_text', el => { el.value = ''; });
      await page.type('#body_text', contentText);
      await page.$eval('#message_body', el => { el.value = ''; });
      await page.type('#message_body', contentHtml);
      await page.click('input.button');

      await page.waitForSelector('#messagetable');
    },

    async activeBeyondCampaign (page, campaignId) {
      await page.goto(WEB_ENDPOINTS.ACTIVE_CAMPAIGN + campaignId);
      await page.waitForSelector('input[name="sendbutton"]');
      await page.click('input[name="sendbutton"]');
    },

    async sendBeyondCampaign (
      unit,
      name,
      subject,
      senderName,
      contentHtml,
      contentText,
      sourceId,
      domainId,
      sendDate,
      segmentId,
      volume,
      testEmail
    ) {
      browser = browser || await this.initBrowser();
      const page = await browser.newPage();

      try {
        page.on('dialog', async dialog => {
          this.logger.info(dialog.message());
          await dialog.accept();
        });

        await page.goto(WEB_ENDPOINTS.HOME);
        await this.loginToWeb(page);

        await this.selectDataSource(page, sourceId);

        const messageId = await this.createBeyondMessage(page, name, subject, senderName, contentHtml, contentText);
        const campaignId = await this.createBeyondCampaign(
          page,
          name,
          sendDate,
          messageId,
          domainId,
          segmentId,
          volume
        );
        await this.activeBeyondCampaign(page, campaignId);
        await this.sendTestMail(page, testEmail, campaignId);

        await page.close();

        return {
          message: STATUS.OK,
          campaignId
        };
      } catch (e) {
        await page.close();
        this.logger.error(e);
        throw new Error(e);
      }
    },

    async processCampaignUpdate (
      campaignId,
      unit,
      name,
      subject,
      senderName,
      contentHtml,
      contentText,
      sourceId,
      domainId,
      sendDate,
      segmentId,
      volume,
      testEmail
    ) {
      browser = browser || await this.initBrowser();
      const page = await browser.newPage();

      try {
        page.on('dialog', async dialog => {
          this.logger.info(dialog.message());
          await dialog.accept();
        });

        await page.goto(WEB_ENDPOINTS.HOME);
        await this.loginToWeb(page);

        await this.selectDataSource(page, sourceId);

        const messageId = await this.updateCampaign(page, campaignId, sendDate, domainId, segmentId, volume);
        await this.updateBeyondMessage(page, messageId, subject, senderName, contentHtml, contentText);
        await this.sendTestMail(page, testEmail, campaignId);

        await page.close();

        return {
          message: STATUS.OK,
          campaignId
        };
      } catch (e) {
        await page.close();
        this.logger.error(e);
        throw new Error(e);
      }
    },

    // find row's cells by cell's value
    async findCellsByCellValue (page, rows, colIndex, value) {
      for (const row of rows) {
        const cells = await row.$$('td');
        if (cells.length <= colIndex) {
          continue;
        }
        const content = await page.evaluate(el => el.textContent.trim(), cells[colIndex]);

        if (content === value) {
          return cells;
        }
      }

      return [];
    },

    async getBeyondDomains (unit) {
      const sessionId = await this.getValidBeyondCredential(unit || 'as');
      const response = await axios({
        method: 'GET',
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_DOMAINS}`,
        data: {
          session_id: sessionId
        }
      });

      if (!response.data.domains) {
        throw new Error(response.data.msg);
      }

      return response.data.domains;
    },

    async getBeyondSegments (unit, sourceId) {
      const sessionId = await this.getValidBeyondCredential(unit || 'as');
      const response = await axios({
        method: 'GET',
        url: `${process.env.BEYOND_HOST}${ENDPOINTS.GET_SEGMENTS}`,
        data: {
          session_id: sessionId,
          source_id: sourceId
        }
      });

      if (!response.data.selections) {
        throw new Error(response.data.msg);
      }

      return response.data.selections;
    },

    async loginToWeb (page, unit) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.BEYOND_WEB, unit);

      await page.type('input[name="username"]', accounts[0].username);
      await page.type('input[name="password"]', accounts[0].password);
      await page.click('input[type="image"]', { delay: 200 });

      await page.waitForSelector('frame');
    },

    async initBrowser () {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox'
        ]
      });

      return browser;
    }
  },

  /**
   * Service created lifecycle event handler
   */
  created () {
    this.initBrowser();
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
