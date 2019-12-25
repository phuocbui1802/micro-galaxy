const winston = require('winston');
const path = require('path');
const rootDir = path.join(__dirname, '../../..');
const colorize = require('winston/lib/winston/config').colorize;
const TSFORMAT = () => (new Date().toLocaleTimeString());

// NOTE-NINH: https://gist.github.com/fisch0920/39a7edc77c422cbf8a18
// How to include filename and line number in winston logger

const transports = !process.env.NODE_ENV
  ? [new winston.transports.Console({
    level: 'debug',
    handleExceptions: true,
    humanReadableUnhandledException: true,
    json: false,
    prettyPrint: true,
    timestamp: TSFORMAT,
    colorize: 'all',
    formatter: (data) => {
      let finalResult = '';
      finalResult += `[${data.timestamp()} - ${data.level.toUpperCase()}]: ${data.message}`;
      if (data.meta && Object.keys(data.meta).length) {
        finalResult += data.meta.message + '\n';
        finalResult += data.meta.stack;
      }
      if (data.level !== 'info') {
        return colorize(data.level, finalResult);
      } else {
        return finalResult;
      }
    }
  })]
  : [
    new winston.transports.File({
      name: 'error',
      level: 'error',
      filename: './logs/error-level.txt',
      handleExceptions: true,
      json: false,
      maxsize: 5242880, // 5MB
      maxFiles: 20,
      timestamp: TSFORMAT,
      prettyPrint: true,
      colorize: 'all',
      formatter: (data) => {
        let finalResult = '';
        finalResult += `[${data.timestamp()} - ${data.level.toUpperCase()}]: ${data.message}`;
        if (data.meta && Object.keys(data.meta).length) {
          finalResult += data.meta.message + '\n';
          finalResult += data.meta.stack;
        }
        if (data.level !== 'info') {
          return colorize(data.level, finalResult);
        } else {
          return finalResult;
        }
      }
    }),
    new winston.transports.File({
      name: 'debug',
      level: 'debug',
      filename: './logs/debug-level.txt',
      handleExceptions: true,
      json: false,
      maxsize: 5242880, // 5MB
      maxFiles: 50,
      timestamp: TSFORMAT,
      prettyPrint: true,
      colorize: 'all',
      formatter: (data) => {
        let finalResult = '';
        finalResult += `[${data.timestamp()} - ${data.level.toUpperCase()}]: ${data.message}`;
        if (data.meta && Object.keys(data.meta).length) {
          finalResult += data.meta.message + '\n';
          finalResult += data.meta.stack;
        }
        if (data.level !== 'info') {
          return colorize(data.level, finalResult);
        } else {
          return finalResult;
        }
      }
    })
  ];
winston.addColors({
  debug: 'green'
});
const logger = new winston.Logger({
  transports: transports,
  exitOnError: false
});

const formatLogArg = (args) => {
  args = Array.prototype.slice.call(args);
  const stackInfo = getStackInfo(1);
  if (stackInfo) {
    const callee = `[${stackInfo.relativePath}:${stackInfo.line}]`;
    if (typeof (args[0]) === 'string') {
      args[0] = `${callee} ${args[0]}`;
    } else {
      args.unshift(callee);
    }
  }
  // Pushing an empty meta object this it's considered a meta
  args.push({});
  return args;
};

const getStackInfo = (stackIndex) => {
  // get call stack, and analyze it
  // get all file, method, and line numbers
  const stackList = (new Error()).stack.split('\n').slice(3);

  // stack trace format:
  // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
  // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
  const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
  const stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;
  const s = stackList[stackIndex] || stackList[0];
  const sp = stackReg.exec(s) || stackReg2.exec(s);

  if (sp && sp.length === 5) {
    return {
      method: sp[1],
      relativePath: path.relative(rootDir, sp[2]),
      line: sp[3],
      pos: sp[4],
      file: path.basename(sp[2]),
      stack: stackList.join('\n')
    };
  }
};

module.exports.stream = {
  write: (message) => {
    logger.info(message);
  }
};
module.exports.debug = module.exports.log = function () {
  logger.debug.apply(logger, formatLogArg(arguments));
};
module.exports.info = function () {
  logger.info.apply(logger, formatLogArg(arguments));
};
module.exports.warn = function () {
  logger.warn.apply(logger, formatLogArg(arguments));
};
module.exports.error = function () {
  logger.error.apply(logger, formatLogArg(arguments));
};
module.exports.verbose = function () {
  logger.verbose.apply(logger, formatLogArg(arguments));
};
