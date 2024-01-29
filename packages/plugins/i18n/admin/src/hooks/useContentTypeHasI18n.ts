import { useTypedSelector } from '../store/hooks';
import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';

const useContentTypeHasI18n = (): boolean => {
  // TODO: re-add this back in
  // const pluginOptions = useTypedSelector(
  //   (state) => state['content-manager'].listView.contentType?.pluginOptions
  // );

  // if (doesPluginOptionsHaveI18nLocalized(pluginOptions)) {
  //   return pluginOptions.i18n.localized;
  // }

  return false;
};

export { useContentTypeHasI18n };
