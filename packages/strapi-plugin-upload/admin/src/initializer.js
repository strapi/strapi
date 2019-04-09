/**
 *
 * Initializers
 *
 * ------------
 *
 * Execute logic to make your plugin ready to be displayed
 * The app will wait until all the plugins are ready before rendering
 * the admin.
 *
 * These components will be mounted only once when the app is loaded.
 *
 */

const Initializer = require('./containers/Initializer');

module.exports = Initializer.default;
