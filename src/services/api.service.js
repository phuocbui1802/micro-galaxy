'use strict';

require('dotenv').config();
const ApiGateway = require('moleculer-web/index.js');

module.exports = {
  name: 'api',
  mixins: [ApiGateway],

  // More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
  settings: {
    port: process.env.PORT || 3000,

    routes: [{
      path: '/v2',
      mappingPolicy: 'restrict',
      aliases: {
        'POST green-arrow/lead': 'gateway_green_arrow.handleAddEmailToList',
        'PUT green-arrow/unsub/:email': 'gateway_green_arrow.handleUnsubEmail',
        'POST green-arrow/blacklist/:email': 'gateway_green_arrow.handleAddBlacklistEmail',
        'GET green-arrow/mailings': 'gateway_green_arrow.handleGetListMailings',
        'GET green-arrow/mailings/:mailingId/campaigns': 'gateway_green_arrow.handleGetListCampaignsByMailingId',
        'GET green-arrow/campaigns/:campaignId': 'gateway_green_arrow.handleGetASingleCampaign',

        'GET adspirit/conversions': 'gateway_adspirit.handleGetAdspiritConversions',
        'POST adspirit/conversion-events': 'gateway_adspirit.handleCreateAdspiritConversionEvent',
        'POST adspirit/click-tracking': 'gateway_adspirit.handleCreateAdspiritClickTracking',

        'POST beyond/lead': 'gateway_beyond.handleAddEmailToList',
        'POST beyond/blacklist': 'gateway_beyond.handleAddEmailToBlacklist',
        'PUT beyond/unsubscribe/:email': 'gateway_beyond.handleUnsubscribeEmail',
        'GET beyond/reports': 'gateway_beyond.handleGetBeyondReports',
        'GET beyond/users/:email_address': 'gateway_beyond.handleGetBeyondUser',
        'GET beyond/campaigns/:campaignId/message': 'gateway_beyond.handleGetBeyondCampaignById'
      }
    }],

    // Serve assets from "public" folder
    assets: {
      folder: 'public'
    }
  }
};
