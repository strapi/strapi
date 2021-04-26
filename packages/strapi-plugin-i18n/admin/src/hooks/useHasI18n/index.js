import { useSelector } from 'react-redux';
import get from 'lodash/get';

const selectContentManagerListViewPluginOptions = state =>
  state.get('content-manager_listView').contentType.pluginOptions;

const useHasI18n = () => {
  const pluginOptions = useSelector(selectContentManagerListViewPluginOptions);

  return get(pluginOptions, 'i18n.localized', false);
};

export default useHasI18n;
