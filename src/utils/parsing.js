const logger = require('./logger.js');

const parsingUtil = {
  parseEmployeeData: (records) => {
    const employees = [];
    records.forEach(record => {
      let employeeEmail = null;
      record.email.forEach(emailAddress => {
        if (emailAddress.primary_address) {
          employeeEmail = emailAddress.email_address;
        }
      });
      employees.push({
        crm_id: record.id,
        user_name: record.user_name,
        full_name: record.full_name,
        email: employeeEmail,
        updated_time: record.date_modified
      });
    });
    return employees;
  },

  parseOpportunityData: (records) => {
    const campaigns = [];
    records.forEach(record => {
      let replaced = record.volumen_c.toString();
      while (replaced.indexOf('.') !== -1) replaced = replaced.replace('.', '');
      let bookedMails = parseInt(replaced);
      if (isNaN(bookedMails)) {
        bookedMails = 0;
        logger.warn('Booked mails is not a number: ', record.volumen_c);
      }
      campaigns.push({
        crm_id: record.id,
        name: record.name,
        account_id: record.account_id,
        sales_id: record.created_by,
        advertiser: record.agenturkunde_c,
        won_date: new Date(record.date_modified),
        updated_time: record.date_modified,
        created_time: record.date_entered,
        booked_mails: bookedMails,
        campaign_type: record.abrechnungsart_c.toUpperCase(),
        geo: record.geotagreting_c.toUpperCase()
      });
    });
    return campaigns;
  },

  parseAccountData: (records) => {
    const accounts = [];
    records.forEach(record => {
      accounts.push({
        crm_id: record.id,
        name: record.name,
        updated_time: record.date_modified
      });
    });
    return accounts;
  },

  parseTaskData: (records) => {
    const tasks = [];
    records.forEach(record => {
      tasks.push({
        crm_id: record.id,
        crm_campaign_id: record.parent_id,
        crm_campaign_manager_id: record.assigned_user_id,
        updated_time: record.date_modified
      });
    });
    return tasks;
  },

  kajomiDatetimeToUTC: (dateString) => {
    const fullDateArray = dateString.split(' ');
    const hourArray = fullDateArray[0].split(':');
    const dateArray = fullDateArray[1].split('.');
    const hour = hourArray[0];
    const minute = hourArray[1];
    const day = dateArray[0];
    const month = dateArray[1];
    const year = dateArray[2];
    const finalDate = new Date(year, month - 1, day, hour, minute);
    const timeZoneDiff = (finalDate.getTimezoneOffset() / 60);
    // Because Kajomi date is at GMT+2
    finalDate.setHours(finalDate.getHours() - (timeZoneDiff + 2));
    return finalDate;
  },

  beyondDatetimeToUTC: (beyondDatetime) => {
    const timeZoneDiff = (beyondDatetime.getTimezoneOffset() / 60);
    // Because Kajomi date is at GMT+2
    beyondDatetime.setHours(beyondDatetime.getHours() - (timeZoneDiff + 2));
    return beyondDatetime;
  },

  numberWithoutSeparator: (numberString) => {
    let replaced = numberString;
    while (replaced.indexOf('.') !== -1) replaced = replaced.replace('.', '');
    while (replaced.indexOf(',') !== -1) replaced = replaced.replace(',', '');
    return replaced;
  },

  inxmailDatetimeToServerTime: (inxmailDateString) => {
    const serverDate = new Date(inxmailDateString);
    const timeZoneDiff = (serverDate.getTimezoneOffset() / 60);
    serverDate.setHours(serverDate.getHours() - timeZoneDiff);
    return serverDate;
  }
};

module.exports = parsingUtil;
