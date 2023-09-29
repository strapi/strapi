'use strict';

const fs = require('fs');

module.exports = ({}) => ({
  verifyProjectIsVersionedOnGit() {
    try {
      return fs.existsSync('./.git') ? true : undefined;
    } catch (err) {
      console.error(err);
    }
  },
});
