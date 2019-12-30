'use strict';

require('dotenv').config();
const multiparty = require('multiparty');
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
        'GET beyond/campaigns/:campaignId/message': 'gateway_beyond.handleGetBeyondCampaignById',

        'GET cleverpush/channels': 'gateway_cleverpush.handleGetListChannels',
        'GET cleverpush/channels/:channelId/notifications': 'gateway_cleverpush.handleGetListNotifications',

        'GET contasimple/:number': 'gateway_contasimple.handleGetContasimpleInvoiceByNumber',

        'GET easy/:document_number': 'gateway_easy.handleGetDocumentByDocumentNumber',
        'GET easy': 'gateway_easy.handleGetAllInvoices',

        'GET expert': 'gateway_expert.handleGetAllNewsletter',
        'GET expert/:unit/lists': 'gateway_expert.handleGetAllLists',
        'GET expert/:unit/workflow': 'gateway_expert.handleGetWorkflowMessage',
        'GET expert/:message_id': 'gateway_expert.handleGetStatOfAMessage',
        'POST expert/lead': 'gateway_expert.handleAddEmailToList',
        'POST expert/unsub': 'gateway_expert.handleUnSubEmailAddress',
        'POST expert/blacklist': 'gateway_expert.handleBlacklistEmailAddress',
        // 'PUT expert/config': 'gateway_expert.handleUpdateExpertSenderConfig',

        'GET expertfr': 'gateway_expertfr.handleGetAllNewsletter',
        'GET expertfr/:message_id': 'gateway_expertfr.handleGetStatOfAMessage',
        'DELETE expertfr/email/:email_address': 'gateway_expertfr.handleDeleteEmailAddress',

        'POST inxmail/lead': 'gateway_inxmail.handleAddEmailToList',

        'GET kajomi/email/:email_address': 'gateway_kajomi.handleGetKajomiEmailInfo',
        'GET kajomi/lists': 'gateway_kajomi.handleGetAllLists',
        'GET kajomi/new_report': 'gateway_kajomi.handleGetKajomiNewReport',
        'GET kajomi/new_report/:mailing_id': 'gateway_kajomi.handleGetKajomiReportOfAMailing',
        'GET kajomi/mailings/:mailingId': 'gateway_kajomi.handleGetMailingById',
        'POST kajomi/lead': 'gateway_kajomi.handleAddEmailToList',
        'DELETE kajomi/email': 'gateway_kajomi.handleDeleteEmailInKajomi',
        'GET kajomi_mailc/new_report': 'gateway_mailc_kajomi.handleGetMailcKajomiNewReport',
        'GET kajomi_mailc/lists': 'gateway_mailc_kajomi.handleGetAllLists',
        'POST kajomi_mailc/lead': 'gateway_mailc_kajomi.handleAddEmailToList',

        'GET maileon': 'gateway_maileon.handleGetNewMailingFromXQueue',

        'GET mailx': 'gateway_mailx.',

        'GET sende/:unit': 'gateway_sende.handleTestSendEffect',
        'GET sende/:unit/lists': 'gateway_sende.handleGetAllLists',
        'PUT sende/:unit/unsub/:email_address': 'gateway_sende.handleUnSubEmail',
        'POST sende/:unit/lead': 'gateway_sende.handleAddEmailToList',

        'GET slip/:unit/stat': 'gateway_slip.handleGetStatOfSendoutByDate',
        'GET slip/:unit/stat/:sendout_id': 'gateway_slip.handleGetStatOfASendout',

        'GET tracking-urls/tracking-chain': 'gateway_tracking_url.handleGetTrackingChain',

        'GET xero/invoice/:invoice_number': 'gateway_xero.handleGetInvoiceByNumber',

        'GET sales/currency': 'gateway_salesforce.handleGetAllCurrency',
        'GET sales/ecb': 'gateway_salesforce.handleGetECBUpdatedRate',
        'GET sales/user': 'gateway_salesforce.handleGetSalesForceUser',
        'GET sales/list': 'gateway_salesforce.handleGetSalesForceLists',
        'GET sales/list_upload': 'gateway_salesforce.handleGetSalesForceListUploads',
        'GET sales/account': 'gateway_salesforce.handleGetSalesForceAccount',
        'GET sales/opportunity': 'gateway_salesforce.handleGetSalesForceOpportunity',
        'GET sales/user/new': 'gateway_salesforce.handleGetNewlySalesForceUser',
        'GET sales/account/new': 'gateway_salesforce.handleGetNewlySalesForceAccount',
        'GET sales/opportunity/new': 'gateway_salesforce.handleGetNewlySalesForceOpportunity',
        'GET sales/opportunity/delete': 'gateway_salesforce.handleGetNewlyDeleteOpportunities',
        'GET sales/opportunity/empty-url': 'gateway_salesforce.handleGetSalesForceOpportunityWithEmptyUrl',
        'GET sales/opportunity/:opportunity_id': 'gateway_salesforce.handleGetSpecificOpp',
        'GET sales/list_upload/:list_upload_id': 'gateway_salesforce.handleGetSpecificListUpload',
        'GET sales/list/:list_id': 'gateway_salesforce.handleGetSpecificList',
        'GET sales/account/:account_id': 'gateway_salesforce.handleGetSpecificAccount',
        'GET sales/urls': 'gateway_salesforce.handleGetUrls',
        'PUT sales/opportunity/:opportunity_id': 'gateway_salesforce.handleUpdateOpportunity',
        'PUT sales/opportunity/:opportunity_id/measurement': 'gateway_salesforce.handleUpdateOpportunityMeasurements',
        'PUT sales/currency/:currency_id': 'gateway_salesforce.handleUpdateCurrency',
        'POST sales/bulk/sendout': 'gateway_salesforce.handleCreateBulkSendoutUpdateJob',
        'POST sales/bulk/opportunity': 'gateway_salesforce.handleCreateBulkOpportunityUpdateJob',
        'POST sales/bulk/:jobId' (req, res) {
          this.handleUploadFile(req, res, 'gateway_salesforce.handleUploadBulkUpdateJob');
        },
        'PATCH sales/bulk/:jobId': 'gateway_salesforce.handleCloseBulkUpdateJob',
        'GET sales/bulk/:jobId': 'gateway_salesforce.handleGetBulkUpdateJob',

        'GET sendout': 'gateway_sendout.handleGetSingleSendout'
      }
    }],

    // Route error handler
    onError (req, res, err) {
      this.logger.error(err);

      if (err.isPublic) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(err.status || 500);
        res.end(JSON.stringify({
          client_message: err.message
        }));
      } else {
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(err.status || 500);
        res.end('Server error ');
      }
    }
  },

  methods: {
    handleUploadFile (req, res, action) {
      const form = new multiparty.Form();
      form.parse(req, async (err, fields, files) => {
        if (err) {
          this.sendError(req, res, err);
        }

        try {
          const response = await this.broker.call(action, {
            file: files.file[0],
            ...req.$params
          });
          res.end(JSON.stringify(response));
        } catch (e) {
          this.sendError(req, res, e);
        }
      });
    }
  }
};
