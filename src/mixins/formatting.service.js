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
    }
  }
};
