/**
 * Accepts an object of plugins options like: { i18n: { locale: 'en' }, other: {some: "value"}  }
 * and transform it into an array looking like: [{ i18n: { locale: 'en' }  }, { other: {some: "value"} }]
 */
const arrayOfPluginOptions = (pluginOptions = {}) =>
  Object.keys(pluginOptions || {}).map(key => ({ [key]: pluginOptions[key] }));

export default arrayOfPluginOptions;
