import AutoReloadBlocker from 'components/AutoReloadBlocker';
import request from 'utils/request';

const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request('/content-type-builder/autoReload')
    .then(response => {
      plugin.preventComponentRendering = !response.autoReload;
      plugin.blockerComponent = AutoReloadBlocker;

      return resolve(plugin);
    })
    .catch(err => reject(err));
});


export default shouldRenderCompo;
