const storeData = {
  clear(key) {
    if (localStorage) {
      return localStorage.removeItem(key);
    }

    return null;
  },

  get(key) {
    if (localStorage && localStorage.getItem(key)) {
      return JSON.parse(localStorage.getItem(key));
    }

    return null;
  },

  set(key, value) {
    if (localStorage) {
      return localStorage.setItem(key, JSON.stringify(value, null, 2));
    }
  },
};

export default storeData;