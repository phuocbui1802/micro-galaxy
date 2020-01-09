'use strict';

module.exports = {
  /**
   * Methods
   */
  methods: {
    capitaliseFirstChar (inputString) {
      if (inputString === undefined || inputString === null) {
        return '';
      } else {
        inputString = inputString.toString().toLowerCase();
        inputString = inputString.replace(/^\w/, first => first.toUpperCase());
        return inputString;
      }
    },

    getValidDateString (dateObject) {
      const date = dateObject.getDate();
      const month = dateObject.getMonth() + 1;
      const year = dateObject.getFullYear();
      return year + '-' + (month <= 9 ? '0' + month : month) + '-' +
        (date <= 9 ? '0' + date : date);
    }
  }
};
