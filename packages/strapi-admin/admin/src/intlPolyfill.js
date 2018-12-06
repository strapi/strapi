/**
 * Common configuration for the app in both dev an prod mode
 */
import { translationMessages } from './i18n';
import './public-path';
import render from './renderApp';

// Chunked polyfill for browsers without Intl support
window.onload = function onLoad() {
  if (!window.Intl) {
    Promise.all([
      System.import('intl'),
      System.import('intl/locale-data/jsonp/en.js'),
      System.import('intl/locale-data/jsonp/fr.js'),
    ]).then(() => render(translationMessages));
  } else {
    render(translationMessages);
  }
};