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
      localStorage.removeItem(CONTENT_TYPE);
      localStorage.removeItem(IS_MODEL_TEMPORARY);
      localStorage.removeItem(MENU);
      return localStorage.removeItem(MODEL);
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

    return strapi.notification.info('content-type-builder.notification.info.optimized');
  },

  setMenu(data, menu = MENU) {
    if (localStorage) {
      return localStorage.setItem(menu, stringify(data));
    }

    return strapi.notification.info('content-type-builder.notification.info.optimized');
  },

  setModel(data, model = MODEL) {
    if (localStorage) {
      return localStorage.setItem(model, stringify(data));
    }

    return strapi.notification.info('content-type-builder.notification.info.optimized');
  },

  setIsModelTemporary(isModelTemporay = IS_MODEL_TEMPORARY) {
    if (localStorage) {
      return localStorage.setItem(isModelTemporay, true);
    }

    return strapi.notification.info('content-type-builder.notification.info.optimized');
  },
};
