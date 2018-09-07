import request from 'utils/request';

const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request('/settings-manager/autoReload')
    .then(response => {
      plugin.preventComponentRendering = !response.autoReload.enabled;
      plugin.blockerComponentProps = {
        blockerComponentTitle: 'components.AutoReloadBlocker.header',
        blockerComponentDescription: 'components.AutoReloadBlocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde',
      };

      if (response.environment !== 'development') {
        plugin.preventComponentRendering = true;
        plugin.blockerComponentProps = {
          blockerComponentTitle: 'components.ProductionBlocker.header',
          blockerComponentDescription: 'components.ProductionBlocker.description',
          blockerComponentIcon: 'fa-ban',
          blockerComponentContent: 'renderButton',
        };
      }

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
