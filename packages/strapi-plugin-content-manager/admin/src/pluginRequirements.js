export const shouldRenderCompo = (plugin) => new Promise((resolve) => {
  plugin.preventComponentRendering = false;
  return resolve(plugin);
});
