import { get } from 'lodash';
import pluginId from '../pluginId';

const getFileModelTimestamps = plugins => {
  const timestamps = get(
    plugins,
    [pluginId, 'fileModel', 'schema', 'options', 'timestamps'],
    ['created_at', 'updated_at']
  );

  return timestamps;
};

export default getFileModelTimestamps;
