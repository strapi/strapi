'use strict';

/**
 * An email provider that keeps what it is asked to send, so a test can read the emails the engine
 * sent. Same shape as a provider package (`init()` gives `{ send }`).
 *
 * The messages are kept on a global: Jest gives each test file its own module registry, and the
 * provider is created inside the instance, so a module-level array would not be the one the test
 * file reads.
 */
const KEY = '__END_USERS_SENT_EMAILS__';

const store = () => {
  globalThis[KEY] = globalThis[KEY] || [];

  return globalThis[KEY];
};

/** The emails sent since the last `clearSentEmails()`, oldest first */
const sentEmails = () => [...store()];

const clearSentEmails = () => {
  store().length = 0;
};

const init = () => ({
  async send({ to, subject, html, text }) {
    store().push({ to, subject, html, text });
  },
});

module.exports = { init, sentEmails, clearSentEmails };
