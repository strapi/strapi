'use strict';

const Sentry = require('@sentry/node');
const defaultSettings = require('../config/settings.json');

module.exports = {
  isReady: false,
  _instance: null,
  settings: {},

  /**
   * Initialize Sentry service
   */
  init() {
    // Make sure there isn't a Sentry instance already running
    if (this._instance != null) {
      strapi.log.warn('Sentry has already been initialized');
      return;
    }

    // Retrieve user settings and merge them with the default ones
    this.settings = {
      ...defaultSettings,
      ...strapi.plugins.sentry.config,
    };

    try {
      // Don't init Sentry if no DSN was provided
      if (this.settings.dsn) {
        Sentry.init({
          dsn: this.settings.dsn,
          environment: strapi.config.environment,
        });
        // Store the successfully initialized Sentry instance
        this._instance = Sentry;
        this.isReady = true;
      } else {
        strapi.log.info('strapi-plugin-sentry is disabled because no Sentry DSN was provided');
      }
    } catch (error) {
      strapi.log.warn('Could not set up Sentry, make sure you entered a valid DSN');
    }
  },

  /**
   * Expose Sentry instance through a getter
   * @returns {Sentry}
   */
  getInstance() {
    return this._instance;
  },

  /**
   * Callback to [configure an instance of Sentry's scope]{@link https://docs.sentry.io/platforms/node/enriching-events/scopes/#configuring-the-scope}
   * @callback configureScope
   * @param {Sentry.scope} scope
   * @param {Sentry=} instance An initialized Sentry instance
   */

  /**
   * Higher level method to send exception events to Sentry
   * @param {Error} error An error object
   * @param {configureScope=} configureScope
   */
  sendError(error, configureScope) {
    // Make sure Sentry is ready
    if (!this.isReady) {
      strapi.log.warn("Sentry wasn't properly initialized, cannot send event");
      return;
    }

    this._instance.withScope(scope => {
      // Configure the Sentry scope using the provided callback
      if (this.settings.sendMetadata) {
        configureScope(scope, this._instance);
      }
      // Actually send the Error to Sentry
      this._instance.captureException(error);
    });

    strapi.log.info('An error was sent to Sentry');
  },
};
