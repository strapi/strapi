import AutoReloadBlocker from 'components/AutoReloadBlocker';
import request from 'utils/request';

export const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request('/content-type-builder/autoReload')
    .then(response => {
      plugin.preventComponentRendering = !response.autoReload;
      plugin.blockerComponent = AutoReloadBlocker;
      return resolve(plugin);
    })
    .catch(err => reject(err));
});
