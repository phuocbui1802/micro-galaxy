const CONST_CONFIG = {
  UPLOAD_DIR: 'tmp/uploads',

  SENDOUT_STATUS: {
    SENT: {
      name: 'SENT'
    },
    WAITING: {
      name: 'WAITING'
    },
    RECEIVED: {
      name: 'RECEIVED'
    },
    TESTED: {
      name: 'TESTED'
    },
    APPROVED: {
      name: 'APPROVED'
    },
    SCHEDULED: {
      name: 'SCHEDULED'
    }
  },
  SALESFORCE: {
    OPP_STATUS: {
      CLOSED_WON: 'Closed Won',
      CLOSED_LOST: 'Closed Lost'
    },
    OBJECTS: {
      SENDOUT: 'Sendout__c',
      OPPORTUNITY: 'Opportunity'
    }
  },
  GENDER: {
    MALE: 'm',
    FEMALE: 'f'
  },
  USER_IMPORT_STATUS: {
    USABLE: 'USABLE',
    FAILED: 'FAILED',
    DUPLICATED: 'DUPLICATED',
    BLACKLISTED: 'BLACKLISTED'
  },
  SYSTEMS: {
    BEYOND: 'beyond',
    KAJOMI: 'kajomi',
    CLEVER_PUSH: 'cleverpush',
    DOCTOR_SENDER: 'doctorsender',
    PROMIO: 'promio',
    EXPERT_SENDER: 'expertsender',
    MIND_BAZ: 'mindbaz',
    SEND_EFFECT: 'sendeffect',
    INXMAIL: 'inxmail',
    MAILC_KAJOMI: 'mailckajomi',
    EXPERT: {
      EXPERT_U0: 'expert_u0',
      EXPERT_U1: 'expert_u1',
      EXPERT_U2: 'expert_u2',
      EXPERT_U3: 'expert_u3',
      EXPERT_U4: 'expert_u4',
      EXPERT_U5: 'expert_u5',
      EXPERT_U6: 'expert_u6',
      EXPERT_U7: 'expert_u7',
      EXPERT_U8: 'expert_u8',
      EXPERT_U9: 'expert_u9',
      EXPERT_U10: 'expert_u10'
    },
    EXPERT_FR: 'expertfr',
    SENDE: 'sende',
    SENDE_EP: 'sendeep',
    INXMAIL9: 'inxmail9',
    INXMAIL10: 'inxmail10'
  },
  CLIENT_MESSAGE: {
    SENDOUT_NOT_EXSIST: 'sendout not exist',
    SENDOUT_OK_RESPONSE: {
      message: 'OK',
      system: '',
      id: '',
      total: '',
      reports: ''
    }
  },
  MAILING_SYSTEM_ACCOUNT_TYPES: {
    USER_AND_PASS: 1,
    OAUTH: 2
  }
};

module.exports = CONST_CONFIG;
