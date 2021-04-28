import pluginId from '../../pluginId';

const selectLayout = state => state.get(`${pluginId}_editViewLayoutManager`).currentLayout;

export default selectLayout;
