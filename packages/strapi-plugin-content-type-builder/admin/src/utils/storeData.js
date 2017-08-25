const CONTENT_TYPE = 'contentType';
const IS_MODEL_TEMPORARY = 'isModelTemporay';
const MENU = 'menu';
const MODEL = 'model';
const parse = JSON.parse;
const stringify = JSON.stringify;
/* eslint-disable consistent-return */

export const storeData = {
  clearAppStorage() {
    if (localStorage) {
      return localStorage.clear();
    }
  },

  clearContentType(contentType = CONTENT_TYPE) {
    if (localStorage) {
      return localStorage.removeItem(contentType);
    }
  },

  clearMenu(menu = MENU) {
    if (localStorage) {
      return localStorage.removeItem(menu);
    }
  },

  getContentType(contentType = CONTENT_TYPE) {
    return parse(localStorage.getItem(contentType)) || null;
  },


  getIsModelTemporary(isModelTemporay = IS_MODEL_TEMPORARY) {
    return localStorage.getItem(isModelTemporay) || null;
  },

  getMenu(menu = MENU) {
    return parse(localStorage.getItem(menu)) || null;
  },

  getModel(model = MODEL) {
    return parse(localStorage.getItem(model)) || null;
  },

  setContentType(data, contentType = CONTENT_TYPE) {
    if (localStorage) {
      return localStorage.setItem(contentType, stringify(data));
    }

    return window.Strapi.notification.info('This plugin is optimized with your localStorage');
  },

  setMenu(data, menu = MENU) {
    if (localStorage) {
      return localStorage.setItem(menu, stringify(data));
    }

    return window.Strapi.notification.info('This plugin is optimized with your localStorage');
  },

  setModel(data, model = MODEL) {
    if (localStorage) {
      return localStorage.setItem(model, stringify(data));
    }

    return window.Strapi.notification.info('This plugin is optimized with your localStorage');
  },

  setIsModelTemporary(isModelTemporay = IS_MODEL_TEMPORARY) {
    if (localStorage) {
      return localStorage.setItem(isModelTemporay, true);
    }

    return window.Strapi.notification.info('This plugin is optimized with your localStorage');
  },
}
