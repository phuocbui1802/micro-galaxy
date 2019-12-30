'use strict';

const rp = require('request-promise');
const cheerio = require('cheerio');
const parse = require('csv-parse/lib/sync');
const moment = require('moment');
const shortID = require('shortid');

const externalSystemAccountService = require('../../mixins/external_system_account.service.js');
const { SYSTEMS } = require('../../utils/constants.js');

const ENDPOINTS = {
  LOGIN: '/control/index_home.php',
  ACCEPTED_CONVERSIONS: '/control/stat_track_protokoll.php',
  REJECTED_CONVERSIONS: '/control/stat_track_protokoll_false.php',
  CREATE_CONVERSION_EVENT: '/control/kamp_track_edit.php',
  TRACKING_SWITCHER: '/control/trackingweiche_edit.php',
  TRACKING_CODE: '/control/trackingweiche_itm_edit.php',
  CREATE_CREATIVE: '/control/werbemittel_new_html.php'
};

const UNIT_HOST_HTTPS = 'https://s7.bratashine.com';
const DEFAULT_CAMPAIGN_ID = '1';
const DEFAULT_PLACEMENT_ID = '1';
const ID_ALL = -1;
const LANGUAGE_ID_EN = 2;
const SENDOUT_ID_SEPARATOR = ',';
const SAVED_ID_SELECTOR = 'input[name="intID"]';
const TRACKING_TYPE = {
  S2S: 1,
  PIXEL: 2
};

const cookiejar = rp.jar();

module.exports = {
  name: 'gateway_adspirit',
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

    async handleGetAdspiritConversions (ctx) {
      const response = await this.getConversions(ctx.params.from, ctx.params.to, ctx.params.rejected);

      return {
        total: response.length,
        status: 'OK',
        conversions: response
      };
    },

    async handleCreateAdspiritConversionEvent (ctx) {
      const { id, name, value, revenue, postClick, postView, validation } = ctx.params;

      const response = await this.createConversionEvent(
        id,
        name,
        value,
        revenue,
        postClick,
        postView,
        validation
      );

      return {
        status: 'OK',
        data: response
      };
    },

    async handleCreateAdspiritClickTracking (ctx) {
      const response = await this.createClickTrackingCode(ctx.params.url, ctx.params.trkinfo, ctx.params.extParams);

      return {
        status: 'OK',
        code: response
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

    async login () {
      const accounts = await this.getExternalSystemAccount(SYSTEMS.ADSPIRIT);

      const $ = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + ENDPOINTS.LOGIN,
        form: {
          kname: accounts[0].username,
          kpass: accounts[0].password,
          s: 'Login'
        },
        jar: cookiejar,
        // transform to jQuery object
        transform: function (body) {
          return cheerio.load(body);
        }
      });

      // check login status from username section
      if ($('a.indexhome_username').length === 0) {
        throw new Error('Login to Adspirit failed!');
      }
    },

    async getConversions (fromDate, toDate, rejected = false) {
      const fromD = moment(fromDate || '2019-01-01');
      const toD = moment(toDate);
      const endpoint = (parseInt(rejected) === 1) ? ENDPOINTS.REJECTED_CONVERSIONS : ENDPOINTS.ACCEPTED_CONVERSIONS;

      await this.login();
      const csv = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + endpoint,
        form: {
          aid_search: '',
          aid: ID_ALL,
          mid_search: '',
          mid: ID_ALL,
          kid_search: '',
          kid: DEFAULT_CAMPAIGN_ID,
          from_d: fromD.format('DD'),
          from_m: fromD.format('MM'),
          from_y: fromD.format('YYYY'),
          to_d: toD.format('DD'),
          to_m: toD.format('MM'),
          to_y: toD.format('YYYYY'),
          s: 'Continue+%BB',
          csv: 1,
          max: -1,
          asm_lang: LANGUAGE_ID_EN
        },
        jar: cookiejar
      });

      const rows = parse(csv, {
        columns: true,
        skip_empty_lines: true
      });

      return this.transformConversionReport(rows);
    },

    async createConversionEvent (eventId, eventName, value, revenue, postClick, postView, validation) {
      const name = `${eventId} ${eventName}`;

      await this.login();
      const actionId = await this.createTrackingAction(name, value, revenue, postClick, postView, validation);
      const trackingSwitcherId = await this.createTrackingSwitcher(name);
      await this.createTrackingCode(name, actionId, trackingSwitcherId, TRACKING_TYPE.S2S);
      await this.createTrackingCode(name, actionId, trackingSwitcherId, TRACKING_TYPE.PIXEL);

      return {
        id: actionId,
        trackingSwitcherId
      };
    },

    async createTrackingAction (name, value, revenue, postClick, postView, validation) {
      const $ = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + ENDPOINTS.CREATE_CONVERSION_EVENT,
        form: {
          backfile: '',
          intID: -1,
          K_intID_search: '',
          K_intID: DEFAULT_CAMPAIGN_ID,
          I_intID_search: '',
          I_intID: 0,
          strName: name,
          floatWert: value,
          boolWertInProz: 0,
          floatPayWertMP: revenue,
          boolPayWertInProzMP: 0,
          floatPayWertAP: '0,5',
          boolPayWertInProzAP: 0,
          fltSpread2Website1: '0,00',
          fltSpread2Website2: '0,00',
          fltSpread3Website1: '0,00',
          fltSpread3Website2: '0,00',
          fltSpread3Website3: '0,00',
          fltSpread4Website1: '0,00',
          fltSpread4Website2: '0,00',
          fltSpread4Website3: '0,00',
          fltSpread4Website4: '0,00',
          fltSpread5Website1: '0,00',
          fltSpread5Website2: '0,00',
          fltSpread5Website3: '0,00',
          fltSpread5Website4: '0,00',
          fltSpread5Website5: '0,00',
          boolActionForPostClick: 1,
          fltPostClickTimeframe: postClick,
          boolActionForPostView: 1,
          fltPostViewTimeframe: postView,
          intMaxActionsTotal: 0,
          intMaxActionsMonth: 0,
          intMaxActionsDay: 0,
          daActiveFrom_hi: '-',
          daActiveFrom_d: '-',
          daActiveFrom_m: '-',
          daActiveFrom_y: '-',
          daActiveUntil_hi: '-',
          daActiveUntil_d: '-',
          daActiveUntil_m: '-',
          daActiveUntil_y: '-',
          boolOrdernumberDeDuplication: 0,
          intReloadSperre: 60,
          boolCountryTarget: 0,
          strCountryTarget: '',
          boolAutoAccept: validation,
          intAutoAcceptDays: 0,
          intExcludeCampaignDays: 30,
          strAntiFakeToken: '',
          MP_F_intID: ID_ALL,
          s: 'Save',
          asm_lang: LANGUAGE_ID_EN
        },
        jar: cookiejar,
        // transform to jQuery object
        transform: function (body) {
          return cheerio.load(body);
        }
      });

      if ($(SAVED_ID_SELECTOR).length === 0) {
        throw new Error('Error while creating conversion event');
      }

      return $(SAVED_ID_SELECTOR).val();
    },

    async createTrackingSwitcher (trackingSwitcherName) {
      await this.login();
      const $ = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + ENDPOINTS.TRACKING_SWITCHER,
        form: {
          backfile: '',
          intID: -1,
          strName: trackingSwitcherName,
          boolS2Sonly: 0,
          intExclusiveMode: 0,
          intExclusiveView: 0,
          intReloadSperre: 0,
          boolHidden: 0,
          s: 'Save',
          asm_lang: LANGUAGE_ID_EN
        },
        jar: cookiejar,
        // transform to jQuery object
        transform: function (body) {
          return cheerio.load(body);
        }
      });

      if ($(SAVED_ID_SELECTOR).length === 0) {
        throw new Error('Error while creating tracking switcher');
      }

      return $(SAVED_ID_SELECTOR).val();
    },

    async createTrackingCode (trackingCodeName, trackingActionId, trackingSwicherId, trackingType) {
      await this.login();
      const $ = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + ENDPOINTS.TRACKING_CODE,
        form: {
          backfile: '',
          intID: -1,
          T_intID_search: '',
          T_intID: trackingSwicherId,
          strName: trackingType === TRACKING_TYPE.S2S
            ? `${trackingCodeName}_S2S`
            : `${trackingCodeName}_PIXEL`,
          boolActive: 1,
          daActiveFrom_hi: '-',
          daActiveFrom_d: '-',
          daActiveFrom_m: '-',
          daActiveFrom_y: '-',
          daActiveUntil_hi: '-',
          daActiveUntil_d: '-',
          daActiveUntil_m: '-',
          daActiveUntil_y: '-',
          intType: trackingType === TRACKING_TYPE.S2S ? 1 : 0,
          strCode: trackingType === TRACKING_TYPE.S2S ? ''
            : `<img src="${UNIT_HOST_HTTPS}/adtrack.php?id=${trackingActionId}&saleid=%transactionid%" border="0" width="1" height="1" alt="">`,
          strServerURL: trackingType === TRACKING_TYPE.PIXEL ? ''
            : `${UNIT_HOST_HTTPS}/adtrack.php?id=${trackingActionId}&saleid=%transactionid%&sid=%sid%&extsubid=%extsubid%&force=1&trkinfo=%trkinfo%`,
          U_intID_search: '',
          U_intID: -1,
          WS_intID: -1,
          P_intID: -1,
          M_intID_search: '',
          M_intID: -1,
          K_intID: -1,
          WM_intID_search: '',
          WM_intID: -1,
          strParameterTargeting: '',
          boolOnlyOne: 0,
          boolPostView: 1,
          s: 'Save',
          asm_lang: LANGUAGE_ID_EN
        },
        jar: cookiejar,
        // transform to jQuery object
        transform: function (body) {
          return cheerio.load(body);
        }
      });

      if ($(SAVED_ID_SELECTOR).length === 0) {
        throw new Error('Error while create conversion event');
      }

      return $(SAVED_ID_SELECTOR).val();
    },

    async createCreative (landingUrl) {
      await this.login();
      const $ = await rp({
        method: 'POST',
        uri: process.env.ADSPIRIT_HOST + ENDPOINTS.CREATE_CREATIVE,
        form: {
          backfile: '',
          intID: ID_ALL,
          K_intID_search: '',
          K_intID: DEFAULT_CAMPAIGN_ID,
          strName: 'HTML_' + Date.now(),
          strURL: landingUrl,
          strADomain: '',
          H_strCode: '',
          H_intWidth: 0,
          H_intHeight: 0,
          boolSSLEnabled: this.urlIstHttps(landingUrl),
          intAsyncType: 0,
          intStatus: '1',
          daStart_hi: '-',
          daStart_d: '-',
          daStart_m: '-',
          daStart_y: '-',
          daEnde_hi: '-',
          daEnde_d: '-',
          daEnde_m: '-',
          daEnde_y: '-',
          fcsel: '0;0',
          V_intViewCount: 0,
          V_intViewTime: 0,
          fcselb: '0;0',
          V_intViewCount2: 0,
          V_intViewTime2: 0,
          fcselc: '0;0',
          V_intViewCount3: 0,
          V_intViewTime3: 0,
          intCapClickTime: 0,
          s: 'Save',
          boolOverrideCampaignPlanning: 0,
          intZiel: 0,
          intTypDay: 0,
          intTypKamp: 0,
          V_intViewN: 0,
          V_intViewD: 0,
          V_intViewDM: 0,
          V_intClickN: 0,
          V_intClickD: 0,
          V_intClickDM: 0,
          boolOverrideCampaignPricing: 0,
          fltTKPBrutto: '0,00',
          fltTKPRabatt1: '0,00',
          fltTKPRabatt2: '0,00',
          fltTKPRabatt3: '0,00',
          fltTKPKickback: '0,00',
          V_intViewPM: '0,50',
          V_intViewP: '0,50',
          fltCPCBrutto: '0,00',
          fltCPCRabatt1: '0,00',
          fltCPCRabatt2: '0,00',
          fltCPCRabatt3: '0,00',
          fltCPCKickback: '0,00',
          V_intClickPM: '0,20',
          V_intClickP: '0,20',
          fltMaxDailyBudgetM: '0,00',
          fltMaxDailyBudget: '0,00',
          boolUseOwnTargeting: 0,
          boolGeoIP: 0,
          boolGeoISP: 0,
          boolGeoSpeed: 0,
          boolIPTargeting: 0,
          boolCookies: 0,
          boolComTargeting: 0,
          intSex: 0,
          intAgeFrom: 0,
          intAgeTo: 99,
          intMoneyFrom: 0,
          intMoneyTo: 9.999,
          boolNeed1: 0,
          boolNeed2: 0,
          boolNeed4: 0,
          boolNeed8: 0,
          boolNeed16: 0,
          boolNeed32: 0,
          boolNeed64: 0,
          boolNeed128: 0,
          boolNeed256: 0,
          boolNeed512: 0,
          boolTargetBrowser: 0,
          boolTargetOS: 0,
          boolTargetDevice: 0,
          boolTargetLang: 0,
          strTargetLang: '',
          boolReTarget: 0,
          strReTarget: '',
          intRetargetMinAge: '0,00',
          intRetargetMaxAge: '30,00',
          boolParamTargeting: 0,
          strParamTarget: '',
          boolTrafficTypeTargeting: 0,
          boolURLTargeting: 0,
          strURLBlackList: '',
          strURLWhiteList: '',
          boolAppTargeting: 0,
          strAppBlackList: '',
          strAppWhiteList: '',
          boolGDPRTargeting: 0,
          boolKeywordTargeting: 0,
          boolVisibilityTargeting: 0,
          boolScreenTargeting: 0,
          intMinScreenX: 0,
          intMaxScreenX: 999,
          intMinScreenY: 0,
          intMaxScreenY: 999,
          boolWindowTargeting: 0,
          intMinWindowX: 0,
          intMaxWindowX: 999,
          intMinWindowY: 0,
          intMaxWindowY: 999,
          boolVisitTargeting: 0,
          intMinVisitAds: 0,
          intMaxVisitAds: 999,
          intMinVisitTime: 0,
          intMaxVisitTime: 999,
          boolFlashTargeting: 0,
          intMinFlashVer: 1,
          intMaxFlashVer: 99,
          OBA_boolEnabled: 0,
          OBA_strTitle: '',
          OBA_strText: '',
          OBA_strURL: '',
          OBA_strLinkText: '',
          boolExpand: 0,
          intExpandTyp: 0,
          intExpandUp: 0,
          intExpandDown: 0,
          intExpandLeft: 0,
          intExpandRight: 0,
          boolStartExpanded: 0,
          intExpandOpenTime: 0,
          intExpandCloseTime: 0,
          intExpandAppearType: 0,
          intExpandAppearTime: 0,
          strJSExpandName: 'expOpen',
          strJSCollapsName: 'expClose',
          intSubType: 0,
          intPosition: 0,
          intLeft: 0,
          intTop: 0,
          intPositionType: 0,
          boolPositionSavePlace: 0,
          P_intLoadTime: 0,
          P_intCloseTime: 0,
          P_strHTML: 'FFFFFF',
          D_strCode: '',
          T_booLink: 0,
          T_strText: 'closeAd',
          intDruck: 0,
          boolNeedScript: 0,
          boolSingleTag: 0,
          intHideReferer: 0,
          boolChangeSiteBG: 0,
          strSiteBGColor: 'FFFFFF',
          strSiteBGURL: '(unable to decode value)',
          strSiteBGPos: 'left top',
          strSiteBGRepeat: 'no-repeat',
          boolSiteBGClickable: 0,
          strSiteBGClickURL: '',
          apn_intID: 0,
          apn_strStatus: '',
          apn_intStatus: 0,
          gdn_strStatus: '',
          gdn_intStatus: 0,
          intTyp: 2,
          strZeitplan: '',
          boolDoNotUseForDisplay: 0,
          boolDoNotUseForAffiliate: 0,
          strKeywordList: '',
          asm_lang: LANGUAGE_ID_EN
        },
        jar: cookiejar,
        // transform to jQuery object
        transform: function (body) {
          return cheerio.load(body);
        }
      });

      if ($(SAVED_ID_SELECTOR).length === 0) {
        throw new Error('Error while create conversion event');
      }

      return $(SAVED_ID_SELECTOR).val();
    },

    async createClickTrackingCode (landingUrl, trkinfo, extParams) {
      const sendoutId = shortID.generate();
      let outputUrlParams = `pid=${DEFAULT_PLACEMENT_ID}&chc=1&nvc=1&dhr=1`;
      landingUrl = this.updateQueryStringParameter(landingUrl, trkinfo, '%trkinfo%');

      if (extParams) {
        for (const key in extParams) {
          landingUrl = this.updateQueryStringParameter(landingUrl, key, `%${key}%`);
          outputUrlParams += `&${key}=${extParams[key]}`;
        }
      }

      const creativeId = await this.createCreative(landingUrl);
      outputUrlParams += `&wmid=${creativeId}&extsubid=${sendoutId}${SENDOUT_ID_SEPARATOR}`;

      return {
        code: `${UNIT_HOST_HTTPS}/adclick.php?` + outputUrlParams,
        sendoutId
      };
    },

    urlIstHttps (url) {
      return url.indexOf('https') !== -1;
    },

    transformConversionReport (rows) {
      const conversions = [];

      for (const row of rows) {
        const ids = row['Ext-SubID'].split(SENDOUT_ID_SEPARATOR);
        const uniqueKey = row.UXID + row['Release date'].replace(/[-\s:]/g, '');

        conversions.push({
          id: uniqueKey,
          conversionEventId: row['Tracking-ID'],
          timestamp: row.Date,
          sendoutId: ids[0] || '',
          galaxyUserId: ids[1] || '',
          revenue: parseInt(row.earnings) || 0,
          value: parseInt(row.Value) || 0
        });
      }

      return conversions;
    },

    // append or set parameter to url
    updateQueryStringParameter (uri, key, value) {
      const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
      if (uri.match(re)) {
        return uri.replace(re, '$1' + key + '=' + value + '$2');
      }

      if (uri.endsWith('?') || uri.endsWith('&')) {
        return uri + key + '=' + value;
      }

      const separator = uri.indexOf('?') !== -1 ? '&' : '?';
      return uri + separator + key + '=' + value;
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
