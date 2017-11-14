import { isEmpty } from 'lodash';

const TOKEN_KEY = 'jwtToken';
const USER_INFO = 'userInfo';

const parse = JSON.parse;
const stringify = JSON.stringify;

const auth = {
  clearAppStorage() {
    if (localStorage) {
      return localStorage.clear();
    }

    if (sessionStorage) {
      return sessionStorage.clear();
    }

    return null;
  },

  clearToken(tokenKey = TOKEN_KEY) {
    if (localStorage) {
      return localStorage.removeItem(tokenKey);
    }

    if (sessionStorage) {
      return sessionStorage.removeItem(tokenKey);
    }

    return null;
  },

  clearUserInfo(userInfo = USER_INFO) {
    if (localStorage) {
      return localStorage.removeItem(userInfo);
    }

    if (sessionStorage) {
      return sessionStorage.removeItem(userInfo);
    }

    return null;
  },

  getToken(tokenKey = TOKEN_KEY) {
    if (localStorage && localStorage.getItem(tokenKey)) {
      return parse(localStorage.getItem(tokenKey)) || null;
    }

    if (sessionStorage && sessionStorage.getItem(tokenKey)) {
      return parse(sessionStorage.getItem(tokenKey)) || null;
    }

    return null;
  },

  getUserInfo(userInfo = USER_INFO) {
    if (localStorage && localStorage.getItem(userInfo)) {
      return parse(localStorage.getItem(userInfo)) || null;
    }

    if (sessionStorage && sessionStorage.getItem(userInfo)) {
      return parse(sessionStorage.getItem(userInfo)) || null;
    }

    return null;
  },

  setToken(value = '', isLocalStorage = false, tokenKey = TOKEN_KEY) {
    if (isEmpty(value)) {
      return null;
    }

    if (isLocalStorage && localStorage) {
      console.log('ok')
      return localStorage.setItem(tokenKey, stringify(value));
    }

    if (sessionStorage && sessionStorage) {
      return sessionStorage.setItem(tokenKey, stringify(value));
    }

    return null;
  },

  setUserInfo(value = '', isLocalStorage = false, userInfo = USER_INFO) {
    if (isEmpty(value)) {
      return null;
    }

    if (isLocalStorage && localStorage) {
      return localStorage.setItem(userInfo, stringify(value));
    }

    if (sessionStorage) {
      return sessionStorage.setItem(userInfo, stringify(value));
    }

    return null;
  },
}

export default auth;
