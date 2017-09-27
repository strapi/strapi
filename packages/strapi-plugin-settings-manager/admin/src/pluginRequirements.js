import AutoReloadBlocker from 'components/AutoReloadBlocker';
import request from 'utils/request';

export const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request('/settings-manager/autoReload')
    .then(response => {
      // TODO change to !response.autoReload;
      plugin.preventComponentRendering = response.autoReload;
      plugin.blockerComponent = AutoReloadBlocker;
      return resolve(plugin);
    })
    .catch(err => reject(err));
});
