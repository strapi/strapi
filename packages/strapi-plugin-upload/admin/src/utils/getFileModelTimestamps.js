import { get } from 'lodash';
import pluginId from '../pluginId';

const getFileModelTimestamps = plugins => {
  const timestamps = get(plugins, [pluginId, 'fileModel', 'options', 'timestamps']);

  // All connectors must initialise the "timestamps" option as a tuple
  if (!Array.isArray(timestamps) || timestamps.length !== 2) {
    throw new Error('Unexpected timestamp field configuration.');
  }

  return timestamps;
};

export default getFileModelTimestamps;
