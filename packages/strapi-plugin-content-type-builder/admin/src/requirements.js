import request from 'utils/request';

const shouldRenderCompo = (plugin) => new Promise((resolve, reject) => {
  request(`${strapi.backendURL}/content-type-builder/autoReload`)
    .then(response => {
      plugin.preventComponentRendering = !response.autoReload;
      plugin.blockerComponentProps = {
        blockerComponentTitle: 'components.AutoReloadBlocker.header',
        blockerComponentDescription: 'components.AutoReloadBlocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde',
      };

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
