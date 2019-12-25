'use strict';

const axios = require('axios');
const moment = require('moment');
const { USER_IMPORT_STATUS } = require('../../utils/constants.js');
const END_POINTS = {
  ADD_USER: 'v2/mailing_lists/:list_id:/subscribers',
  SINGLE_USER: 'v2/mailing_lists/:list_id:/subscribers/:id:',
  GET_LIST_MAILINGS: 'v2/mailing_lists',
  GET_LIST_CAMPAIGNS: 'v2/mailing_lists/{mailingId}/campaigns',
  GET_SINGLE_CAMPAIGN: 'v2/campaigns/{campaignId}',
  GET_USERS_BY_EMAIL: 'v2/subscribers_by_email/:email:',
  ADD_USER_TO_BLACKLIST: 'v2/suppression_lists/:suppression_list_id:/suppressed_addresses/create_multiple'
};

const SUPPRESSION_LIST_ID = '2';
const USER_STATUSES = {
  ACTIVE: 'active',
  UNSUBSCRIBED: 'unsubscribed'
};

const axiosInstance = axios.create({
  baseURL: process.env.GREEN_ARROW_BASE_URL,
  headers: {
    Authorization: `Basic ${process.env.GREEN_ARROW_TOKEN}`
  }
});

module.exports = {
  name: 'gateway_green_arrow',

  /**
  * Service settings
  */
  settings: {

  },

  /**
  * Service dependencies
  */
  dependencies: [],

  /**
  * Actions
  */
  actions: {

    async handleAddEmailToList (ctx) {
      const response = await this.pushEmailsToGreenArrow(
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
        status: response
      };
    },

    async handleUnsubEmail (ctx) {
      await this.unSubEmail(ctx.params.email);
      return {
        message: 'OK'
      };
    },

    async handleAddBlacklistEmail (ctx) {
      await this.addEmailToBlacklist(ctx.params.email);
      return {
        message: 'OK'
      };
    },

    async handleGetListMailings (ctx) {
      const mailings = await this.getListMailings();

      return {
        success: true,
        total: mailings.length,
        mailings
      };
    },

    async handleGetListCampaignsByMailingId (ctx) {
      const campaigns = await this.getListCampaignsByMailingId(
        ctx.params.mailingId,
        ctx.params.from,
        ctx.params.to
      );

      return {
        success: true,
        total: campaigns.length,
        campaigns
      };
    },

    async handleGetASingleCampaign (ctx) {
      const campaign = await this.getSingleCampaign(ctx.params.campaignId);

      return {
        success: true,
        campaign
      };
    }
  },

  /**
  * Events
  */
  events: {

  },

  /**
  * Methods
  */
  methods: {
    createEmailObject (email) {
      return {
        email: email.email,
        status: USER_STATUSES.ACTIVE,
        custom_fields: {
          first_name: email.first_name || '',
          last_name: email.last_name || '',
          city: email.city || '',
          country: email.country || '',
          dob: email.dob ? moment(email.dob, 'YYYY-MM-DD').format('MM/DD/YYYY') : '',
          galaxy_id: email.galaxy_id || '',
          gender: email.gender || '',
          geoip_city: email.geoip_city || '',
          geoip_country: email.geoip_country || '',
          geoip_state: email.geoip_state || '',
          geoip_zip: email.geoip_zip || '',
          region: email.region || '',
          supplier: email.supplier,
          zip: email.zip || ''
        }
      };
    },

    async pushEmailsToGreenArrow (listId, body, overwriteData) {
      this.logger.info('Pushing list to GreenArrow', listId);

      const user = this.createEmailObject(body);
      const userId = await this.getUserId(listId, body.email);

      // check if user already exist in list
      if (userId) {
        this.logger.info('User already exists!', body.email);
        if (overwriteData === 'true') {
          this.logger.info('Overwrite user data!');
          await this.updateUser(listId, userId, user);
        }

        return USER_IMPORT_STATUS.DUPLICATED;
      }
      await this.addUser(listId, user);

      return USER_IMPORT_STATUS.USABLE;
    },

    async getUserId (listId, email) {
      const url = END_POINTS.SINGLE_USER.replace(':list_id:', listId).replace(':id:', email);

      const response = await axiosInstance.get(url);

      return response.data.data ? response.data.data[0].id : null;
    },

    async addUser (listId, user) {
      const url = END_POINTS.ADD_USER.replace(':list_id:', listId);
      const response = await axiosInstance({
        method: 'POST',
        url,
        data: user
      });

      if (!response.data.success) {
        throw new Error(response.data.error_message);
      }
    },

    async updateUser (listId, userId, user) {
      const url = END_POINTS.SINGLE_USER.replace(':list_id:', listId).replace(':id:', userId);
      const response = await axiosInstance({
        method: 'PUT',
        url,
        data: user
      });

      if (!response.data.success) {
        throw new Error(response.data.error_message);
      }

      return response.data;
    },

    async getListMailings () {
      const { data: mailingsRes } = await axiosInstance.get(END_POINTS.GET_LIST_MAILINGS);
      if (!mailingsRes.success) {
        throw new Error(mailingsRes.error_message);
      }
      return mailingsRes.data;
    },

    async getListCampaignsByMailingId (mailingId, from, to) {
      if (!mailingId) {
        throw new Error('MailingId can not be null');
      }
      const params = {};
      if (from && to) {
        from = moment(from).format('X');
        to = moment(to).format('X');
        params.started_at__start = from;
        params.started_at__end = to;
      }
      const url = END_POINTS.GET_LIST_CAMPAIGNS.replace('{mailingId}', mailingId);
      const { data: results } = await axiosInstance.get(url, { params });
      if (!results.success) {
        throw new Error(results.error_message);
      }
      return results.data;
    },

    async getSingleCampaign (campaignId) {
      if (!campaignId) {
        throw new Error('CampaignId can not be null');
      }
      const url = END_POINTS.GET_SINGLE_CAMPAIGN.replace('{campaignId}', campaignId);
      const { data: campaignRes } = await axiosInstance.get(url);
      if (!campaignRes.success) {
        throw new Error(campaignRes.error_message);
      }
      return campaignRes.data;
    },

    async findUsersByEmail (email) {
      const url = END_POINTS.GET_USERS_BY_EMAIL.replace(':email:', email);
      const response = await axiosInstance({
        method: 'GET',
        url
      });

      if (!response.data.success) {
        throw new Error(response.data.error_message);
      }

      return response.data.data;
    },

    async unSubEmail (emailAddress) {
      const users = await this.findUsersByEmail(emailAddress);

      if (!users.length) {
        return;
      }

      for (const user of users) {
        await this.updateUser(user.mailing_list.id, user.id, {
          status: USER_STATUSES.UNSUBSCRIBED
        });
      }
    },

    async addEmailToBlacklist (email) {
      const url = END_POINTS.ADD_USER_TO_BLACKLIST.replace(':suppression_list_id:', SUPPRESSION_LIST_ID);
      const response = await axiosInstance({
        method: 'POST',
        url,
        data: {
          data: [email]
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error_message);
      }
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
