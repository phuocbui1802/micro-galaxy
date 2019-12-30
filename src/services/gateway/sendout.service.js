'use strict';

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');
const BadRequestError = require('../../utils/exception/bad_request_error.js');

module.exports = {
  name: 'gateway_sendout',
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
    async handleGetSingleSendout (ctx) {
      let { system, id, unit } = ctx.params;
      system = system.toLowerCase();
      unit = unit.toLowerCase();
      this.validateSystemName(system, id);

      switch (system) {
        case SYSTEMS.BEYOND:
          return this.broker.call('gateway_beyond.handleGetSendout', {
            unit,
            id
          });
        case SYSTEMS.KAJOMI:
          return this.broker.call('gateway_kajomi.handleGetSendout', {
            unit,
            id
          });
        case SYSTEMS.DOCTOR_SENDER:
          return this.broker.call('gateway_doctorsender.handleGetSendout', {
            unit,
            id
          });
        case SYSTEMS.CLEVER_PUSH:
          return '';
        case SYSTEMS.MIND_BAZ:
          return this.broker.call('gateway_mindbaz.handleGetSendout', {
            unit,
            id
          });
        case SYSTEMS.PROMIO:
          return this.broker.call('gateway_promio.handleGetSendout', {
            unit,
            id
          });
        case SYSTEMS.EXPERT_SENDER:
          system = 'expert_u' + unit;
          return this.broker.call('gateway_expert.handleGetSendout', {
            system,
            id
          });
        case SYSTEMS.INXMAIL:
          return this.broker.call('gateway_inxmail.handleGetSendout', {
            system: system + unit,
            id
          });
        case SYSTEMS.MAILC_KAJOMI:
          return this.broker.call('gateway_mailc_kajomi.handleGetSendout', {
            system,
            id
          });
        case SYSTEMS.EXPERT_FR:
          return this.broker.call('gateway_expertfr.handleGetSendout', {
            system,
            id
          });
        case SYSTEMS.SENDE:
          return '';
        case SYSTEMS.SENDE_EP:
          return this.broker.call('gateway_sender_ep.handleGetSendout', {
            system,
            id
          });
        case SYSTEMS.INXMAIL9:
        case SYSTEMS.INXMAIL10:
          return this.broker.call('gateway_inxmail.handleGetSendout', {
            system,
            id
          });
      }

      if (Object.values(SYSTEMS.EXPERT).indexOf(system) !== -1) {
        return this.broker.call('gateway_expert.handleGetSendout', {
          system,
          id
        });
      }
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
    validateSystemName (system, id) {
      // handle invalid system names
      if (Object.values(SYSTEMS).indexOf(system) === -1) {
        if (Object.values(SYSTEMS.EXPERT).indexOf(system) === -1) {
          throw new BadRequestError('Invalid system name');
        }
      }

      const idErr = new BadRequestError('ID must be a number');

      // handle invalid sendout ID
      if (system === SYSTEMS.INXMAIL) {
        if (id.includes('-') === false) {
          throw new BadRequestError('Inxmail ID should be in form xxxxx-xxxx');
        }

        if (/^\d+$/.test(id.replace(/-/g, '')) === false) {
          throw idErr;
        }
      } else {
        if (/^\d+$/.test(id) === false) {
          throw idErr;
        }
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
