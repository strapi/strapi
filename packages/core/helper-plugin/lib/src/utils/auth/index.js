// TODO @soupette we need to refactor this file

import { isNil } from 'lodash';
import isEmpty from 'lodash/isEmpty';

const TOKEN_KEY = 'jwtToken';
const USER_INFO = 'userInfo';
const CURRENT_STEP = 'GUIDED_TOUR_CURRENT_STEP';
const COMPLETED_STEPS = 'GUIDED_TOUR_COMPLETED_STEPS';
const SKIPPED = 'GUIDED_TOUR_SKIPPED';
const THEME_KEY = 'STRAPI_THEME'; // Also used in packages/core/admin/admin/src/components/ThemeToggleProvider/index.js
const UPLOAD_MODAL_VIEW = 'STRAPI_UPLOAD_MODAL_VIEW';
const UPLOAD_VIEW = 'STRAPI_UPLOAD_LIBRARY_VIEW';

const parse = JSON.parse;
const stringify = JSON.stringify;

const auth = {
  clear(key) {
    if (localStorage && localStorage.getItem(key)) {
      return localStorage.removeItem(key);
    }

    if (sessionStorage && sessionStorage.getItem(key)) {
      return sessionStorage.removeItem(key);
    }

    return null;
  },

  clearAppStorage() {
    if (localStorage) {
      const videos = auth.get('videos');
      const onboarding = auth.get('onboarding');
      const strapiUpdateNotification = auth.get('STRAPI_UPDATE_NOTIF');
      const localeLang = localStorage.getItem('strapi-admin-language');
      const guidedTourCurrentStep = auth.get(CURRENT_STEP);
      const guidedTourState = auth.get(COMPLETED_STEPS);
      const guidedTourSkipped = parse(localStorage.getItem(SKIPPED));
      const applicationTheme = localStorage.getItem(THEME_KEY);
      const uploadMediaLibraryView = localStorage.getItem(UPLOAD_VIEW);
      const uploadMediaLibraryModalView = localStorage.getItem(UPLOAD_MODAL_VIEW);

      localStorage.clear();

      localStorage.setItem('videos', JSON.stringify(videos));
      localStorage.setItem('onboarding', onboarding);
      localStorage.setItem('STRAPI_UPDATE_NOTIF', strapiUpdateNotification);
      localStorage.setItem('strapi-admin-language', localeLang);
      localStorage.setItem(CURRENT_STEP, stringify(guidedTourCurrentStep));
      localStorage.setItem(COMPLETED_STEPS, stringify(guidedTourState));
      localStorage.setItem(SKIPPED, stringify(guidedTourSkipped));
      localStorage.setItem(THEME_KEY, applicationTheme);
      !isNil(uploadMediaLibraryView) && localStorage.setItem(UPLOAD_VIEW, uploadMediaLibraryView);
      !isNil(uploadMediaLibraryModalView) &&
        localStorage.setItem(UPLOAD_MODAL_VIEW, uploadMediaLibraryModalView);
    }

    if (sessionStorage) {
      sessionStorage.clear();
    }
  },

  clearToken(tokenKey = TOKEN_KEY) {
    return auth.clear(tokenKey);
  },

  clearUserInfo(userInfo = USER_INFO) {
    return auth.clear(userInfo);
  },

  get(key) {
    if (localStorage && localStorage.getItem(key)) {
      return parse(localStorage.getItem(key)) || null;
    }

    if (sessionStorage && sessionStorage.getItem(key)) {
      return parse(sessionStorage.getItem(key)) || null;
    }

    return null;
  },

  getToken(tokenKey = TOKEN_KEY) {
    return auth.get(tokenKey);
  },

  getUserInfo(userInfo = USER_INFO) {
    return auth.get(userInfo);
  },

  set(value, key, isLocalStorage) {
    if (isEmpty(value)) {
      return null;
    }

    if (isLocalStorage && localStorage) {
      return localStorage.setItem(key, stringify(value));
    }

    if (sessionStorage) {
      return sessionStorage.setItem(key, stringify(value));
    }

    return null;
  },

  setToken(value = '', isLocalStorage = false, tokenKey = TOKEN_KEY) {
    return auth.set(value, tokenKey, isLocalStorage);
  },

  setUserInfo(value = '', isLocalStorage = false, userInfo = USER_INFO) {
    return auth.set(value, userInfo, isLocalStorage);
  },

  updateToken(value = '') {
    const isLocalStorage = localStorage && localStorage.getItem(TOKEN_KEY);

    return auth.setToken(value, isLocalStorage);
  },
};

export default auth;
