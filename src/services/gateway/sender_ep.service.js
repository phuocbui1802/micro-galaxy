'use strict';

const axios = require('axios/index.js');
const Moment = require('moment');
const X2JS = require('x2js');
const xmlBuilder = require('xmlbuilder');
const x2js = new X2JS();

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const formattingService = require('../../mixins/formatting.service.js');
const { SYSTEMS, SENDE_EP, CLIENT_MESSAGE } = require('../../utils/constants.js');

const ENDPOINTS = {
  LAST_SENDOUTS: 'middleware/api/?username=:user_name:&token=:token:&module=stats&type=custom&format=json&name=GetLastSendouts&recipients=5&fromdate=:from_date:&todate=:to_date:&count=:count:',
  UNSUB_EMAIL: 'middleware/api/?username=:user_name:&token=:token:&module=subscribers&action=unsubscribe&emailaddress=:email_address:&dataformat=base64',
  GET_ALL_LISTS: 'middleware/api/?username=:user_name:&token=:token:&module=lists&action=getlists&noexclusionlists=1'
};

const SENDE_EARLIEST_DATE = Moment('2017-05-30').format('YYYY-MM-DD');
const SENDOUT_LIMIT = 1000;
const RECURSIVE_PERIOD = 30;
const SENDE_DUPLICATED_MESSAGE = ':email: already exists in the given list';

const axiosInstance = axios.create({
  baseURL: process.env.SENDER_EP_HOST
});

module.exports = {
  name: 'gateway_sender_ep',
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

    async handleLastSendEffectSendouts (ctx) {
      const reports = await this.getLastSendouts();

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

    async handleGetAllLists (ctx) {
      const response = await this.getAllLists();

      return {
        message: 'OK',
        total: response.length,
        system: 'SendEffect_EP',
        lists: response
      };
    },

    handleAddEmailToList (ctx) {
      return this.addEmailToList(ctx.params.list_id, ctx.params);
    },

    handleGetSendout (ctx) {
      return this.getSendoutByID(ctx.params.system, ctx.params.id);
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

    async getLastSendouts () {
      let toDate = new Moment();
      let fromDate = new Moment();
      fromDate.date(fromDate.date() - 30);
      toDate.date(toDate.date() + 1);
      toDate = toDate.format('YYYY-MM-DD');
      fromDate = fromDate.format('YYYY-MM-DD');
      let url = ENDPOINTS.LAST_SENDOUTS;
      url = await this.addCredentialToUrl(url);
      url = url.replace(':from_date:', fromDate);
      url = url.replace(':to_date:', toDate);
      url = url.replace(':count:', 200);

      const response = await axiosInstance({
        url,
        method: 'GET'
      });

      return response.data.result.data;
    },

    getSendoutByID (system, id) {
      const toDate = new Moment().add(1, 'days').format('YYYY-MM-DD');
      return this.getSendoutByDate(toDate, system, id);
    },

    async getSendoutByDate (toDate, system, id) {
      const fullReturnData = Object.assign({}, CLIENT_MESSAGE.SENDOUT_OK_RESPONSE);
      fullReturnData.system = system;
      fullReturnData.id = id;
      fullReturnData.total = 0;
      fullReturnData.reports = [{
        client_message: CLIENT_MESSAGE.SENDOUT_NOT_EXSIST
      }];
      const emptyResponse = fullReturnData;

      // the earliest sendout was sent on 5/6/17
      // if input date is smaller than that then sendout doesn't exist
      // exit the recursion
      if (toDate < SENDE_EARLIEST_DATE) {
        return emptyResponse;
      } else {
        const fromDate = Moment(toDate, 'YYYY-MM-DD')
          .subtract(RECURSIVE_PERIOD, 'days')
          .format('YYYY-MM-DD');
        let url = ENDPOINTS.LAST_SENDOUTS;
        url = await this.addCredentialToUrl(url);
        url = url.replace(':from_date:', fromDate);
        url = url.replace(':to_date:', toDate);
        url = url.replace(':count:', SENDOUT_LIMIT);
        const response = await axiosInstance({
          url,
          method: 'GET'
        });

        const rowData = response.data.result.data;
        // received sendouts are sorted in descending order
        // if the first item ID of the next response smaller than input ID
        // then the sendout doesn't exist, exit the recursion
        if (Number(rowData[0].statid) < Number(id)) {
          return emptyResponse;
        }
        const returnData = rowData.filter(obj => {
          return obj.statid === id;
        });
        if (returnData.length !== 0) {
          fullReturnData.total = 1;
          fullReturnData.reports = returnData;
          return fullReturnData;
        }
        return this.getSendoutByDate(fromDate, system, id);
      }
    },

    async unSubEmail (emailAddress) {
      let url = ENDPOINTS.UNSUB_EMAIL;
      url = await this.addCredentialToUrl(url);
      const emailInbase64 = Buffer.from(emailAddress).toString('base64');
      url = url.replace(':email_address:', emailInbase64);
      const requestConfig = {
        url,
        method: 'GET'
      };
      const response = await axiosInstance(requestConfig);
      const jsonData = x2js.xml2js(response.data);

      return jsonData.result.success;
    },

    async getAllLists () {
      let url = ENDPOINTS.GET_ALL_LISTS;
      url = await this.addCredentialToUrl(url);
      const requestConfig = {
        url,
        method: 'GET'
      };
      const response = await axiosInstance(requestConfig);
      let jsonData = x2js.xml2js(response.data).result.data.list;
      if (!Array.isArray(jsonData)) jsonData = [jsonData];
      return jsonData.map(list => {
        return {
          id: list.listid,
          name: list.name
        };
      });
    },

    async addEmailToList (listId, body) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.SENDE_EP);
      const username = accounts[0].username;
      const token = accounts[0].password;
      const url = process.env.SENDER_EP_HOST;
      const idMapping = SENDE_EP.ID_MAPPING;

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
        .ele('fieldid', idMapping.first_name).up()
        .ele('value', this.capitaliseFirstChar(body.first_name)).up().up()
        .ele('item')
        .ele('fieldid', idMapping.last_name).up()
        .ele('value', this.capitaliseFirstChar(body.last_name)).up().up()
        .ele('item')
        .ele('fieldid', idMapping.gender).up()
        .ele('value', body.gender).up().up()
        .ele('item')
        .ele('fieldid', idMapping.country).up()
        .ele('value', body.country).up().up()
        .ele('item')
        .ele('fieldid', idMapping.city).up()
        .ele('value', this.capitaliseFirstChar(body.city)).up().up()
        .ele('item')
        .ele('fieldid', idMapping.region).up()
        .ele('value', this.capitaliseFirstChar(body.region)).up().up()
        .ele('item')
        .ele('fieldid', idMapping.zip).up()
        .ele('value', body.zip).up().up()
        .ele('item')
        .ele('fieldid', idMapping.md5).up()
        .ele('value', body.md5).up().up()
        .ele('item')
        .ele('fieldid', idMapping.galaxy_id).up()
        .ele('value', body.galaxy_id).up().up()
        .ele('item')
        .ele('fieldid', idMapping.supplier).up()
        .ele('value', body.supplier).up().up()
        .ele('item')
        .ele('fieldid', body.dob ? idMapping.dob : '').up()
        .ele('value', body.dob).up().up()
        .ele('item')
        .ele('fieldid', idMapping.city_ip).up()
        .ele('value', body.geoip_city).up().up()
        .ele('item')
        .ele('fieldid', idMapping.country_ip).up()
        .ele('value', body.geoip_country).up().up()
        .ele('item')
        .ele('fieldid', idMapping.zip_ip).up()
        .ele('value', body.geoip_zip).up().up()
        .ele('item')
        .ele('fieldid', idMapping.region_ip).up()
        .ele('value', body.geoip_state).up().up()
        .end({ pretty: true });

      const emptyTag = '<item>\n' +
        '        <fieldid/>\n' +
        '        <value/>\n' +
        '      </item>\n';

      xmlString = xmlString.split(emptyTag).join('');

      const response = await axios.post(
        url,
        xmlString,
        { headers: { 'Content-Type': 'text/xml' } }
      );

      const duplicateReturnMessage = SENDE_DUPLICATED_MESSAGE.replace(':email:', body.email);
      const responseMessage = x2js.xml2js(response.data).response.errormessage;
      const responseStatus = x2js.xml2js(response.data).response.status;
      if (responseMessage === duplicateReturnMessage) {
        return responseMessage;
      } else if (responseStatus === 'FAILED') {
        throw responseMessage;
      } else {
        return 'OK';
      }
    },
    async addCredentialToUrl (url) {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.SENDE_EP);

      url = url.replace(':user_name:', accounts[0].username);
      url = url.replace(':token:', accounts[0].password);

      return url;
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
