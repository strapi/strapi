import AutoReloadBlocker from 'components/AutoReloadBlocker';
import ProductionBlocker from 'components/ProductionBlocker';
import request from 'utils/request';

export const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request('/settings-manager/autoReload')
    .then(response => {
      plugin.preventComponentRendering = !response.autoReload;
      plugin.blockerComponent = AutoReloadBlocker;

      if (response.environment !== 'development') {
        plugin.preventComponentRendering = true;
        plugin.blockerComponent = ProductionBlocker;
      }

      return resolve(plugin);
    })
    .catch(err => reject(err));
});
