'use strict';

/**
 * An email provider for development: it sends nothing, it writes each email to
 * `.tmp/emails/<timestamp>-<to>.json` as `{ to, subject, html, text }`, so a person (or the e2e
 * suite of the example front end) can open the file and follow the link in it. No SMTP is needed.
 *
 * Example code only: a real project installs a provider such as `@strapi/provider-email-nodemailer`.
 * `config/plugins.ts` points the email plugin at this file.
 */
const fs = require('node:fs');
const path = require('node:path');

/** Keeps the address readable in a file name, and out of other folders */
const toFileName = (to) => String(to).replace(/[^a-zA-Z0-9@._+-]/g, '_');

module.exports = {
  init(providerOptions = {}) {
    const directory = providerOptions.directory || path.join(process.cwd(), '.tmp', 'emails');

    return {
      async send({ to, subject, html, text }) {
        const recipient = Array.isArray(to) ? to.join(',') : to;

        fs.mkdirSync(directory, { recursive: true });

        // Two emails in the same millisecond must not overwrite each other
        let timestamp = Date.now();
        let file = path.join(directory, `${timestamp}-${toFileName(recipient)}.json`);

        while (fs.existsSync(file)) {
          timestamp += 1;
          file = path.join(directory, `${timestamp}-${toFileName(recipient)}.json`);
        }

        fs.writeFileSync(file, JSON.stringify({ to: recipient, subject, html, text }, null, 2));
      },
    };
  },
};
