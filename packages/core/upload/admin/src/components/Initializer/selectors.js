import pluginId from '../../pluginId';

const selectFileModelTimestamps = state => state[`${pluginId}_fileModel`].fileModelTimestamps;

export default selectFileModelTimestamps;
