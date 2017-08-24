const CONTENT_TYPE = 'contentType';
// const parse = JSON.parse;
// const stringify = JSON.stringify;

export const storeData = {
  setContentType(data, contentType = CONTENT_TYPE) {
    if (localStorage) {
      return localStorage.setItem(contentType, data);
    }

    return window.Stapi.notification.info('This plugin is optimized with your localStorage');
  },
}
