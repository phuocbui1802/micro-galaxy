'use strict';

const axios = require('axios');
const moment = require('moment');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');

const ENDPOINTS = {
  GET_LIST_CHANNELS: '/channels',
  GET_LIST_NOTIFICATIONS: '/channel/:channelId:/notifications'
};

const axiosInstance = axios.create({
  baseURL: process.env.CLEVER_PUSH_HOST
});

module.exports = {
  name: 'gateway_cleverpush',
  mixins: [externalSystemAccountService],

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
    async handleGetListChannels (ctx) {
      const channels = await this.getListChannels();
      return {
        message: 'OK',
        total: channels.length,
        channels
      };
    },

    async handleGetListNotifications (ctx) {
      const { limit, startDate, endDate, channelId } = ctx.params;
      const notifications = await this.getListNotifications(channelId, limit, startDate, endDate);

      return {
        message: 'OK',
        total: notifications.length,
        notifications
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
    async getListChannels () {
      console.log({
        method: 'GET',
        url: ENDPOINTS.GET_LIST_CHANNELS,
        headers: await this.getDefaultHeader()
      });
      const { data } = await axiosInstance({
        method: 'GET',
        url: 'https://api.cleverpush.com' + ENDPOINTS.GET_LIST_CHANNELS,
        headers: await this.getDefaultHeader()
      });

      return data.channels;
    },

    async getListNotifications (channelId, limit = 100, startDate, endDate) {
      const url = ENDPOINTS.GET_LIST_NOTIFICATIONS.replace(':channelId:', channelId);
      if (startDate && endDate) {
        startDate = moment(startDate).format('X');
        endDate = moment(endDate).format('X');
      }
      const { data } = await axiosInstance({
        method: 'GET',
        url,
        headers: await this.getDefaultHeader(),
        params: {
          limit, startDate, endDate
        }
      });
      return data.notifications;
    },

    async getDefaultHeader () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.CLEVER_PUSH);

      return {
        Authorization: accounts[0].token
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
