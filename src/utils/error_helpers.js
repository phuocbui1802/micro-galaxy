const errorHelper = {
  returnClientMessageForAPI: (res, err) => {
    if (err.client_message) {
      const returnData = {
        status: 'FAILED',
        client_message: err.client_message
      };
      res.status(500).send(returnData);
    } else {
      res.status(500).send('Error');
    }
  }
};

module.exports = errorHelper;
