'use strict';

const puppeteer = require('puppeteer');

module.exports = {
  name: 'gateway_tracking_url',
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
    async handleGetTrackingChain (ctx) {
      const response = await this.findTrackingChain(ctx.params.url, ctx.params.country);

      return {
        message: 'OK',
        data: response
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
    async findTrackingChain (url, country = '') {
      const urls = [];
      let browser, page;

      if (country) {
        browser = await puppeteer.launch({
          args: ['--proxy-server=' + process.env.PUPPETEER_PROXY_HOST]
        });
        page = await browser.newPage();
        await page.authenticate({
          username: process.env.PUPPETEER_PROXY_USER + country,
          password: process.env.PUPPETEER_PROXY_PASS
        });
      } else {
        browser = await puppeteer.launch();
        page = await browser.newPage();
      }

      const response = await page.goto(url);
      const sites = response.request().redirectChain();

      if (response.status() !== 200) {
        throw new Error('Page now found!');
      }

      for (const site of sites) {
        urls.push(site.url());
      }

      browser.close();

      return urls;
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
