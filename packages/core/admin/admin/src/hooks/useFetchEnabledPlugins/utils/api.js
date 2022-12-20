import { getFetchClient } from '../../../utils/getFetchClient';

const fetchEnabledPlugins = async () => {
  const { get } = getFetchClient();
  const { data } = await get('/admin/plugins');

  return data;
};

export { fetchEnabledPlugins };
