'use strict';

const fs = require('fs');
const readline = require('readline');
module.exports = {
  /**
   * Methods
   */
  methods: {
    addedEmailToFile (filePath, emailAddress, newFilePath) {
      return new Promise(resolve => {
        const readStream = fs.createReadStream(filePath);
        const lines = [];
        const rl = readline.createInterface({
          input: readStream,
          output: null,
          terminal: false
        });
        rl.on('line', line => {
          lines.push(line);
        });
        rl.on('close', () => {
          lines.push(emailAddress);
          this.writeNewFile(newFilePath, lines)
            .then(() => {
              resolve(lines);
            });
        });
      });
    },

    writeNewFile (filePath, lines) {
      return new Promise(resolve => {
        const writeStream = fs.createWriteStream(filePath);
        writeStream.on('finish', () => {
          this.logger.info('Written new blacklist file to: ', filePath);
          resolve(null);
        });
        for (let i = 0; i < lines.length; ++i) {
          writeStream.write(lines[i] || '');
          writeStream.write('\n');
        }

        writeStream.end();
      });
    }
  }
};
