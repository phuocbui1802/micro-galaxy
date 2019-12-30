'use strict';

const axios = require('axios/index.js');
const Moment = require('moment/moment.js');
const X2JS = require('x2js/x2js.js');
const x2js = new X2JS();
const xmlBuilder = require('xmlbuilder');

const credentialsService = require('../../mixins/credentials.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const { SENDE, USER_IMPORT_STATUS } = require('../../utils/constants.js');

const SENDE_DUPLICATED_MESSAGE = ':email: already exists in the given list';
const ENDPOINTS = {
  LAST_SENDOUTS: '/middleware/api?module=stats&type=custom&format=json&name=GetLastSendouts&recipients=5&count=200',
  UNSUB_EMAIL: '/middleware/api/?module=subscribers&action=unsubscribe&emailaddress=:email_address:&dataformat=base64',
  GET_ALL_LISTS: '/middleware/api/?module=lists&action=getlists&noexclusionlists=1'
};

module.exports = {
  name: 'gateway_sende',
  mixins: [credentialsService, formattingService],

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

    async handleTestSendEffect (ctx) {
      const reports = await this.getLastSendouts(ctx.params.unit);

      return {
        total: reports.length,
        message: 'OK',
        reports
      };
    },

    async handleUnSubEmail (ctx) {
      const response = await this.unSubEmail(ctx.params.unit, ctx.params.email_address);

      return {
        message: 'OK',
        response: response === 1 ? 'OK' : 'Not OK'
      };
    },

    async handleAddEmailToList (ctx) {
      const status = await this.addEmailToList(ctx.params.unit, ctx.params.list_id, ctx.params);

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
      const response = await this.getAllLists(ctx.params.unit);

      return ({
        message: 'OK',
        total: response.length,
        system: 'SendEffect_' + ctx.params.unit,
        lists: response
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

    async getConfigFromDatabase (unit) {
      try {
        const configName = ('sendeffect_' + unit.toString()).toLowerCase();
        return await this.getConfigByName(configName);
      } catch (e) {
        this.logger.error('Error getConfigFromDatabase: ', e);
      }
    },

    async getLastSendouts (unit) {
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      let todate = new Moment();
      let fromdate = new Moment();
      fromdate.date(fromdate.date() - 30);
      todate.date(todate.date() + 1);
      todate = todate.format('YYYY-MM-DD');
      fromdate = fromdate.format('YYYY-MM-DD');
      const url = jsonConfig.base_url + ENDPOINTS.LAST_SENDOUTS;
      const requestConfig = {
        url,
        method: 'GET',
        params: {
          fromdate,
          todate,
          username: jsonConfig.username,
          token: jsonConfig.token
        }
      };
      return axios(requestConfig)
        .then(response => {
          return response.data.result.data;
        });
    },

    async unSubEmail (unit, emailAddress) {
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      let url = jsonConfig.base_url + ENDPOINTS.UNSUB_EMAIL;
      const emailInbase64 = Buffer.from(emailAddress).toString('base64');
      url = url.replace(':email_address:', emailInbase64);
      const requestConfig = {
        url,
        method: 'GET'
      };
      const response = await axios(requestConfig);
      const jsonData = x2js.xml2js(response.data);
      return jsonData.result.success;
    },

    async addEmailToList (unit, listId, body) {
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      const username = jsonConfig.username;
      const token = jsonConfig.token;
      const url = jsonConfig.url;
      const IdMapping = SENDE.ID_MAPPING;

      if (body.dob) { body.dob = Moment(body.dob, 'YYYY-MM-DD').format('DD/MM/YYYY'); }
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

      let xmlString = xmlBuilder.begin()
        .ele('xmlrequest')
        .ele('username', username).up()
        .ele('usertoken', token).up()
        .ele('requesttype', 'subscribers').up()
        .ele('requestmethod', 'AddSubscriberToList').up()
        .ele('details')
        .ele('emailaddress', body.email).up()
        .ele('mailinglist', listId).up()
        .ele('confirmed', 1).up()
        .ele('format', 'html').up()
        .ele('customfields')
        .ele('item')
        .ele('fieldid', IdMapping.first_name).up()
        .ele('value', this.capitaliseFirstChar(body.first_name)).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.last_name).up()
        .ele('value', this.capitaliseFirstChar(body.last_name)).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.gender).up()
        .ele('value', body.gender).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.country).up()
        .ele('value', body.country).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.city).up()
        .ele('value', this.capitaliseFirstChar(body.city)).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.region).up()
        .ele('value', this.capitaliseFirstChar(body.region)).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.zip).up()
        .ele('value', body.zip).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.supplier).up()
        .ele('value', body.supplier).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.md5).up()
        .ele('value', body.md5).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.galaxy_id).up()
        .ele('value', body.galaxy_id).up().up()
        .ele('item')
        .ele('fieldid', body.dob ? IdMapping.dob : '').up()
        .ele('value', body.dob).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.city_ip).up()
        .ele('value', body.geoip_city).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.country_ip).up()
        .ele('value', body.geoip_country).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.zip_ip).up()
        .ele('value', body.geoip_zip).up().up()
        .ele('item')
        .ele('fieldid', IdMapping.region_ip).up()
        .ele('value', body.geoip_state).up().up()
        .end({ pretty: true });

      const emptyTag = '<item>\n' +
        '        <fieldid/>\n' +
        '        <value/>\n' +
        '      </item>\n';

      xmlString = xmlString.split(emptyTag).join('');
      try {
        const response = await axios.post(
          url,
          xmlString,
          {
            headers:
              { 'Content-Type': 'text/xml' }
          });
        const duplicateReturnMessage = SENDE_DUPLICATED_MESSAGE.replace(':email:', body.email);
        const responseMessage = x2js.xml2js(response.data).response.errormessage;
        const responseStatus = x2js.xml2js(response.data).response.status;
        if (responseMessage === duplicateReturnMessage) {
          return USER_IMPORT_STATUS.DUPLICATED;
        } else if (responseStatus === 'FAILED') {
          return USER_IMPORT_STATUS.FAILED;
        } else {
          return USER_IMPORT_STATUS.USABLE;
        }
      } catch (err) {
        this.logger.error(err);
      }
    },

    async getAllLists (unit) {
      const { json_config: jsonConfig } = await this.getConfigFromDatabase(unit);
      const url = jsonConfig.base_url + ENDPOINTS.GET_ALL_LISTS;
      const requestConfig = {
        url,
        method: 'GET',
        params: {
          username: jsonConfig.username,
          token: jsonConfig.token
        }
      };

      const response = await axios(requestConfig);
      let jsonData = x2js.xml2js(response.data).result.data.list;
      if (!Array.isArray(jsonData)) jsonData = [jsonData];
      return jsonData.map(list => {
        return {
          id: list.listid,
          name: list.name
        };
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
