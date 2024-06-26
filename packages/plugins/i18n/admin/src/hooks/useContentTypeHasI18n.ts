import { useTypedSelector } from '../store/hooks';
import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';

const useContentTypeHasI18n = (): boolean => {
  const pluginOptions = useTypedSelector(
    (state) => state['content-manager_listView'].contentType?.pluginOptions
  );

  if (doesPluginOptionsHaveI18nLocalized(pluginOptions)) {
    return pluginOptions.i18n.localized;
  }

  return false;
};

export { useContentTypeHasI18n };
